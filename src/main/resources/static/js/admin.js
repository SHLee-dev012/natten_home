// 관리자 열람 — 브라우저 안에서만 명단을 푼다.
//
// 배포본에 실려 나가는 것은 암호문(admin/roster.enc.json)뿐이다. 암호구절은
// 어디로도 전송되지 않고, 저장하지도 않는다(localStorage·쿠키·URL 전부 안 쓴다).
// 푼 내용도 메모리에만 두고, '잠그기'를 누르거나 탭을 닫으면 사라진다.
//
// 한계는 분명하다. 암호문은 누구나 받아갈 수 있으므로 오프라인 대입이 가능하다.
// 그래서 봉인 도구(tools/seal-roster.mjs)가 짧은 암호구절을 거절하고, 키 유도에
// PBKDF2 60만 회를 건다 — 한 번 풀 때 이 브라우저에서도 1초 안팎 걸리는 것이
// 정상이고, 그 값이 그대로 공격자의 시도당 비용이 된다.
(function () {
    "use strict";

    var gate = document.getElementById("gate");
    var vault = document.getElementById("vault");
    var form = document.getElementById("gate-form");
    var pass = document.getElementById("gate-pass");
    var go = document.getElementById("gate-go");
    var msg = document.getElementById("gate-msg");

    var data = null;   // 풀린 명단. 잠그면 null 로 되돌린다.

    function say(text, kind) {
        msg.textContent = text;
        msg.className = "msg" + (kind ? " msg-" + kind : "");
    }

    function b64ToBytes(s) {
        var raw = atob(s);
        var out = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    // WebCrypto 는 보안 컨텍스트(https 또는 localhost)에서만 열린다.
    function cryptoReady() {
        return window.isSecureContext && window.crypto && window.crypto.subtle;
    }

    function deriveKey(passphrase, salt, iterations) {
        var enc = new TextEncoder();
        return crypto.subtle
            .importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"])
            .then(function (base) {
                return crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
                    base,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["decrypt"]
                );
            });
    }

    function unseal(envelope, passphrase) {
        var salt = b64ToBytes(envelope.salt);
        var iv = b64ToBytes(envelope.iv);
        var ct = b64ToBytes(envelope.ct);
        return deriveKey(passphrase, salt, envelope.iter).then(function (key) {
            // 암호구절이 틀리면 GCM 인증 태그가 맞지 않아 여기서 예외가 난다.
            // 즉 "틀렸다"는 판정을 우리 코드가 내리는 게 아니라 암호가 내린다.
            return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
        }).then(function (buf) {
            return JSON.parse(new TextDecoder().decode(buf));
        });
    }

    // ── 표 그리기 ──────────────────────────────────────────────────────
    var theadRow = document.getElementById("thead-row");
    var tbody = document.getElementById("tbody");
    var countEl = document.getElementById("count");
    var q = document.getElementById("q");

    function render(filter) {
        var needle = (filter || "").trim().toLowerCase();
        tbody.textContent = "";
        var shown = 0;
        data.rows.forEach(function (row) {
            if (needle && row.join(" ").toLowerCase().indexOf(needle) === -1) return;
            var tr = document.createElement("tr");
            row.forEach(function (cell, i) {
                var td = document.createElement("td");
                td.textContent = cell;
                td.setAttribute("data-label", data.columns[i] || "");
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
            shown++;
        });
        countEl.textContent = needle
            ? shown + " / " + data.rows.length + "명"
            : data.rows.length + "명";
    }

    function open(payload) {
        data = payload;
        document.getElementById("v-title").textContent = data.title || "명단";
        document.getElementById("v-note").textContent = data.note || "";
        theadRow.textContent = "";
        data.columns.forEach(function (c) {
            var th = document.createElement("th");
            th.textContent = c;
            theadRow.appendChild(th);
        });
        if (data.sealed) {
            document.getElementById("sealed").textContent =
                "봉인 시각 " + new Date(data.sealed).toLocaleString("ko-KR");
        }
        render("");
        gate.hidden = true;
        vault.hidden = false;
        q.focus();
    }

    function lock() {
        data = null;
        tbody.textContent = "";
        theadRow.textContent = "";
        q.value = "";
        pass.value = "";
        vault.hidden = true;
        gate.hidden = false;
        say("");
        pass.focus();
    }

    q.addEventListener("input", function () { if (data) render(q.value); });
    document.getElementById("lock").addEventListener("click", lock);

    // ── 열기 ───────────────────────────────────────────────────────────
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!cryptoReady()) {
            say("이 브라우저에서는 열 수 없습니다. https 주소로 접속해 주세요.", "bad");
            return;
        }
        var entered = pass.value;
        if (!entered) return;

        go.disabled = true;
        say("여는 중… 몇 초 걸립니다.");

        // 상대 경로라 루트에서도, 하위 경로에서도 같은 자리를 가리킨다.
        fetch("admin/roster.enc.json", { cache: "no-store" })
            .then(function (r) {
                if (r.status === 404) throw new Error("NOFILE");
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then(function (env) { return unseal(env, entered); })
            .then(function (payload) {
                // 푼 즉시 암호구절을 지운다. 입력칸에 남겨두면 개발자도구나
                // 브라우저 자동완성에 그대로 노출된다.
                entered = null;
                pass.value = "";
                open(payload);
            })
            .catch(function (err) {
                if (err && err.message === "NOFILE") {
                    say("아직 봉인된 명단이 없습니다. tools/seal-roster.mjs 로 만들어 올려주세요.", "bad");
                } else if (err && String(err.message || "").indexOf("HTTP") === 0) {
                    say("명단을 받아오지 못했습니다 (" + err.message + ").", "bad");
                } else {
                    // 복호 실패 — 암호구절이 틀렸거나 파일이 손상됐다.
                    say("암호구절이 맞지 않습니다.", "bad");
                }
                pass.select();
            })
            .finally(function () { go.disabled = false; });
    });

    pass.focus();
})();
