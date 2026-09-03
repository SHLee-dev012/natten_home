#!/usr/bin/env node
//
// 명단을 봉인해 배포용 암호문으로 바꾼다.
//
//   local/roster.json  (평문, git 에 올라가지 않음)
//        ↓  PBKDF2-SHA256 600,000회로 암호구절에서 키를 뽑고
//        ↓  AES-256-GCM 으로 잠근다
//   src/main/resources/static/admin/roster.enc.json  (암호문, git 에 올라감)
//
// 평문은 이 컴퓨터 밖으로 나가지 않는다. CI 도 암호구절도 보지 않고,
// 배포되는 것은 암호문뿐이다.
//
// 쓰는 법
//   node tools/seal-roster.mjs                 # 암호구절을 물어본다
//   ADMIN_PASSPHRASE='...' node tools/seal-roster.mjs   # 비대화식
//
// 주의: 암호문은 공개 주소에 올라간다. 누구나 받아가 집에서 천천히 대입할 수
// 있고, 한 번 받아간 파일은 회수되지 않는다. 그래서 이 도구는 짧거나 뻔한
// 암호구절을 거절한다. 방어력은 오직 암호구절 하나에서 나온다.

import { createInterface } from "node:readline";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SRC = "local/roster.json";
const OUT = "src/main/resources/static/admin/roster.enc.json";
const ITERATIONS = 600_000; // OWASP 2023 권고선
const MIN_LENGTH = 16;

function die(msg) {
  console.error("\n✗ " + msg + "\n");
  process.exit(1);
}

/** 암호구절이 오프라인 대입을 견딜 만한지 본다. 통과 못하면 여기서 멈춘다. */
function checkPassphrase(pass) {
  if (pass.length < MIN_LENGTH) {
    die(
      `암호구절이 ${pass.length}자입니다. 최소 ${MIN_LENGTH}자가 필요합니다.\n` +
        "  암호문이 공개 주소에 올라가므로 짧은 것은 오프라인에서 금방 뚫립니다.\n" +
        "  숫자 PIN 이나 단어 하나는 초 단위로 풀립니다.\n" +
        "  기억할 수 있는 문장을 쓰세요. 예: '남산타워-옥상광장-2026-가을학기'",
    );
  }
  const weak = [
    /^[0-9]+$/,
    /^(password|passphrase|admin|natten|knotsun|낯선대학|낯선)/i,
  ];
  if (weak.some((re) => re.test(pass))) {
    die(
      "너무 뻔한 암호구절입니다. 숫자만이거나 사이트 이름으로 시작합니다.\n" +
        "  가장 먼저 시도되는 후보라 사실상 잠기지 않습니다.",
    );
  }
}

async function ask() {
  if (process.env.ADMIN_PASSPHRASE) return process.env.ADMIN_PASSPHRASE;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // 입력이 화면에 남지 않게 가린다. 터미널 기록에도 남지 않는다.
  const wasRaw = process.stdin.isTTY;
  if (wasRaw) {
    rl.output.write("암호구절: ");
    rl._writeToOutput = () => {};
  }
  const answer = await new Promise((res) =>
    rl.question(wasRaw ? "" : "암호구절: ", res),
  );
  rl.close();
  if (wasRaw) process.stdout.write("\n");
  return answer.trim();
}

// ── 평문 읽기 ───────────────────────────────────────────────────────────
if (!existsSync(SRC)) {
  die(
    `${SRC} 이 없습니다.\n` +
      "  local/ 은 .gitignore 에 있어 평문이 git 으로 새지 않는 자리입니다.\n" +
      "  tools/roster.sample.json 을 복사해 형태를 맞추세요:\n" +
      `    mkdir -p local && cp tools/roster.sample.json ${SRC}`,
  );
}

let roster;
try {
  roster = JSON.parse(readFileSync(SRC, "utf8"));
} catch (e) {
  die(`${SRC} 을 읽지 못했습니다 (JSON 형식 확인): ${e.message}`);
}
if (!Array.isArray(roster.columns) || !Array.isArray(roster.rows)) {
  die(`${SRC} 에 columns 와 rows 배열이 있어야 합니다.`);
}
const bad = roster.rows.findIndex((r) => r.length !== roster.columns.length);
if (bad >= 0) {
  die(
    `${bad + 1}번째 행의 칸 수가 columns(${roster.columns.length}개)와 다릅니다.`,
  );
}

const pass = await ask();
if (!pass) die("암호구절이 비어 있습니다.");
checkPassphrase(pass);

// ── 봉인 ────────────────────────────────────────────────────────────────
const salt = randomBytes(16);
const iv = randomBytes(12); // GCM 표준 길이
const key = pbkdf2Sync(pass, salt, ITERATIONS, 32, "sha256");

const plaintext = Buffer.from(
  JSON.stringify({ ...roster, sealed: new Date().toISOString() }),
  "utf8",
);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
// 브라우저 WebCrypto 는 인증 태그가 암호문 뒤에 붙어 있길 기대한다.
const ct = Buffer.concat([body, cipher.getAuthTag()]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      v: 1,
      kdf: "PBKDF2-SHA256",
      iter: ITERATIONS,
      cipher: "AES-256-GCM",
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      ct: ct.toString("base64"),
    },
    null,
    2,
  ) + "\n",
);

console.log(`
✓ 봉인했습니다.

  평문   ${SRC}  (${roster.rows.length}명, git 에 올라가지 않음)
  암호문 ${OUT}  (${(ct.length / 1024).toFixed(1)}KB, git 에 올라감)

  다음: git add ${OUT} 후 커밋·푸시하면 /admin 에서 열립니다.

  암호구절은 어디에도 저장되지 않았습니다. 잃어버리면 다시 봉인하는 수밖에
  없습니다. 바꾸려면 새 암호구절로 이 도구를 다시 돌리세요 — 다만 예전
  암호문은 git 기록에 남으므로, 예전 암호구절로는 예전 명단이 계속 열립니다.
`);
