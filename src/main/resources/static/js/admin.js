// 관리자 열람 — Supabase 로그인으로 명단을 받아온다.
//
// 이 페이지에는 명단이 실려 있지 않다. 로그인해서 받은 토큰으로 DB 에 물어보고,
// 권한 판단은 DB 가 한다(roster 표의 RLS 정책, db/admin-roster.sql 참고).
// 권한이 없으면 서버가 빈 배열을 내주므로, 브라우저 코드를 아무리 고쳐도
// 남의 명단을 볼 수 없다. 앞서 쓰던 '빌드 때 암호화' 방식과 다른 점이 이것이다 —
// 그쪽은 암호문이 공개 주소에 올라가 오프라인으로 뒤질 수 있었다.
//
// 토큰은 sessionStorage 에 둔다. 새로고침은 버티고 탭을 닫으면 사라진다.
// localStorage 는 쓰지 않는다 — 브라우저를 껐다 켜도 남아 공용 기기에서
// 위험하고, 다음 사람이 그대로 명단을 보게 된다. 메모리에만 두는 것도
// 해봤지만, 현장에서 새로고침 한 번에 다시 로그인해야 해 쓸 수 없었다.
(function () {
    "use strict";

    // 게시판(board.js)과 같은 프로젝트. anon 키는 공개용이라 노출이 정상이며,
    // 이 키만으로는 roster 를 읽을 수 없다(RLS 가 막는다).
    var SUPABASE_URL = "https://farunkdduzolqgcgxqmj.supabase.co";
    var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnVua2RkdXpvbHFnY2d4cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgwNjAsImV4cCI6MjEwMTI3NDA2MH0.HdzWaXH8XvokiBJBQ8r5_fc6TjZOCQB86IbvBG9PFaA";

    var TABLE = "roster";
    // 손을 안 대면 잠근다. 검색이 서버를 부르지 않아 토큰이 만료돼도 화면의
    // 명단은 그대로 남는다 — 접수대에 폰을 두고 자리를 비우면 누구나 본다.
    // 그 구멍을 메우는 장치다.
    var IDLE_MS = 30 * 60 * 1000;   // 30분
    // 현장에서 여러 명이 동시에 체크인한다. 15초마다 명단을 다시 받아
    // 서로의 체크인이 서로에게 보이게 한다. 300명을 한 번 받는 비용이
    // 작아서 이 주기로도 부담이 없다.
    var POLL_MS = 15 * 1000;
    // fetch 는 스스로 포기하지 않는다. 휴대폰이 신호를 잃으면 요청이
    // 끝나지도 실패하지도 않고 매달린다. 끊어 주지 않으면 그 요청을
    // 기다리던 표시가 영영 남아 자동 갱신이 조용히 죽는다.
    var REQ_TIMEOUT_MS = 20 * 1000;
    // 그래도 어딘가에서 표시가 남으면 이만큼 지나서 스스로 푼다.
    // 자동 갱신이 멈추는 것보다 한 번 겹쳐 받는 편이 낫다.
    var STUCK_MS = 30 * 1000;
    var WARN_MS = 30 * 1000;        // 잠기기 30초 전부터 알린다
    // Supabase Auth 는 로그인 식별자로 이메일을 요구한다. 화면에서는 아이디만
    // 받고 여기서 도메인을 붙인다 — 쓰는 사람에게는 'admin' 한 단어이고,
    // DB 에는 admin@knotsun.kr 계정이다. '@' 가 들어오면 그대로 쓴다.
    var LOGIN_DOMAIN = "@knotsun.kr";
    // 화면에 내보내지 않을 칸. 있어도 굳이 보여줄 이유가 없다.
    // applied_on(신청일)과 memo(비고)는 현장에서 볼 일이 없어 감춘다.
    // DB 에는 남아 있으므로 다시 보이려면 이 목록에서 빼기만 하면 된다.
    var HIDE = ["id", "created_at", "applied_on", "memo"];
    // 보기 좋은 이름. 여기 없는 칸은 원래 이름 그대로 나온다.
    var LABEL = {
        name: "이름", cohort: "기수", kind: "구분",
        day_qty: "일출권", all_qty: "올출권",
        drink_qty: "음료권", food_qty: "푸드권", checked_in_at: "체크인",
        phone_last4: "전화 뒤4", applied_on: "신청일", memo: "비고",
        code: "코드"
    };
    // 표시 순서. DB 에 칸을 더하면 맨 뒤에 붙는데, 읽는 순서는 그것과 다르다
    // (매수는 구분 바로 옆에 있어야 한다). 여기 적힌 차례로 앞세우고,
    // 적히지 않은 칸은 뒤에 원래 순서대로 붙는다 — 그래서 DB 에 칸을 새로
    // 더해도 화면이 깨지지 않는다.
    // 체크인이 맨 앞이다. 현장에서 하는 일이 "찾아서 누르기" 이므로,
    // 누를 것이 먼저 오고 확인할 값이 뒤따르는 편이 손이 덜 간다.
    // 코드는 이름 바로 뒤다. 코드를 들고 온 사람은 그것부터 부르므로
    // 이름과 나란히 있어야 눈이 덜 움직인다.
    var ORDER = ["checked_in_at", "name", "code", "phone_last4", "kind",
                 "day_qty", "all_qty", "drink_qty", "food_qty",
                 "cohort"];
    // 검색어와 데이터를 같은 모양으로 맞춘다.
    //
    // 한글은 "김"을 한 글자(NFC)로도, 자모 셋(NFD)으로도 적을 수 있다. 눈에는
    // 똑같이 보이지만 문자열로는 다르다. 맥과 아이폰에서 입력하면 NFD 로
    // 들어오는 경우가 있어, DB 에 NFC 로 담긴 이름을 못 찾는 일이 생긴다.
    // 양쪽 다 NFC 로 모으고, 띄어쓰기는 지운다 — "김 하늘" 로 담겼든
    // "김하늘" 로 찾든 같은 사람에게 닿아야 한다.
    function norm(v) {
        if (v == null) return "";
        var t = String(v);
        try { t = t.normalize("NFC"); } catch (e) { /* 아주 옛 브라우저 */ }
        return t.replace(/\s+/g, "").toLowerCase();
    }

    // 검색이 훑을 칸. 사람을 특정하는 값만 본다.
    // 기수와 구분은 여러 사람이 같은 값을 가져서, 넣으면 "낯5" 한 번에 수십
    // 명이 걸려 오히려 찾기 어려워진다. 매수는 숫자라 "2" 로 거의 다 걸린다.
    // 코드는 사람마다 다르므로 검색에 넣는다. 이름이 겹쳐도 코드는 한 명만
    // 걸린다 - 동명이인 34명을 가리는 가장 빠른 길이다.
    var SEARCH = ["name", "phone_last4", "code"];

    function orderCols(keys) {
        var known = [], rest = [];
        keys.forEach(function (k) { (ORDER.indexOf(k) >= 0 ? known : rest).push(k); });
        known.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
        return known.concat(rest);
    }

    // 새로고침을 버티게 하는 자리. 탭 단위라 탭을 닫으면 함께 사라진다.
    var SESSION_KEY = "knotsun.admin.session";

    function saveSession(session) {
        // 언제까지 쓸 수 있는지 계산해 둔다. 지난 토큰으로 화면을 열어놓고
        // 있다가 누를 때마다 실패하는 것보다, 열기 전에 판정하는 편이 낫다.
        tokenExp = session.expires_at
            ? session.expires_at * 1000
            : Date.now() + (session.expires_in || 3600) * 1000;
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                t: session.access_token,
                e: session.user && session.user.email,
                x: tokenExp
            }));
        } catch (e) { /* 저장이 막힌 브라우저면 그냥 이번 탭만 쓴다 */ }
    }

    function readSession() {
        try {
            var v = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
            if (!v || !v.t) return null;
            // 30초 여유를 둔다. 딱 맞춰 만료된 토큰으로 요청을 보내지 않는다.
            if (v.x && Date.now() > v.x - 30000) { clearSession(); return null; }
            return v;
        } catch (e) { return null; }
    }

    function clearSession() {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }

    function toEmail(v) {
        v = (v || "").trim();
        return v.indexOf("@") >= 0 ? v : v + LOGIN_DOMAIN;
    }

    var gate = document.getElementById("gate");
    var vault = document.getElementById("vault");
    var form = document.getElementById("gate-form");
    var email = document.getElementById("gate-email");
    var pass = document.getElementById("gate-pass");
    var go = document.getElementById("gate-go");
    var msg = document.getElementById("gate-msg");
    var theadRow = document.getElementById("thead-row");
    var tbody = document.getElementById("tbody");
    var countEl = document.getElementById("count");
    var q = document.getElementById("q");

    var token = null;   // 접속 토큰. 메모리에만 둔다.
    var whoEmail = "";  // 로그인한 계정. 안내 문구에서 쓰므로 따로 들고 있는다.
    var pollTimer = null;
    // 체크인이 오가는 중에 표를 새로 그리면 누르던 단추가 사라진다.
    // 개수만 세면 요청 하나가 매달렸을 때 영영 0 으로 안 돌아오므로,
    // 시작한 시각도 같이 들고 있다가 너무 오래되면 스스로 푼다.
    var writing = 0;
    var writingAt = 0;
    // 이 접속이 언제 끝나는지(밀리초). 0 이면 모른다.
    var tokenExp = 0;
    var lastSeen = 0;   // 마지막으로 손댄 시각
    var idleTimer = null;
    // 아직 아무것도 받지 않았을 때 보여줄 칸. DB 응답이 오기 전에도, 결과가
    // 0건일 때도 표 머리가 서 있어야 무엇을 조회하는 화면인지 알 수 있다.
    var cols = ORDER.slice();
    var rows = [];

    function say(text, kind) {
        msg.textContent = text;
        msg.className = "msg" + (kind ? " msg-" + kind : "");
    }

    // 금고가 열려 있을 때 하는 말. 로그인 화면의 자리는 그때 숨어 있다.
    var vmsg = document.getElementById("vault-msg");
    function vsay(text, kind) {
        vmsg.textContent = text;
        vmsg.className = "msg" + (kind ? " msg-" + kind : "");
    }

    // ── 표 그리기 ──────────────────────────────────────────────────────
    function render(filter) {
        var needle = norm(filter);
        tbody.textContent = "";
        var shown = 0;
        rows.forEach(function (row) {
            var hay = SEARCH.map(function (c) { return norm(row[c]); }).join(" ");
            if (needle && hay.indexOf(needle) === -1) return;
            var tr = document.createElement("tr");
            tr.dataset.id = row.id;
            cols.forEach(function (c) {
                var td = document.createElement("td");
                td.setAttribute("data-label", LABEL[c] || c);
                if (c === "checked_in_at") {
                    td.className = "cell-checkin";
                    td.appendChild(checkInButton(row));
                } else {
                    // 이름은 자리가 아니라 이름으로 집는다. 칸 차례가 바뀌어도
                    // 굵게 두는 규칙이 엉뚱한 칸에 걸리지 않는다.
                    if (c === "name") td.className = "cell-name";
                    td.textContent = row[c] == null ? "" : String(row[c]);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
            shown++;
        });
        if (!shown) {
            // 빈 표는 고장난 것처럼 보인다. 왜 비었는지 알려준다.
            // 검색으로 걸러져 0건인 것과, 서버가 애초에 0건을 준 것은
            // 원인이 전혀 다르므로 따로 말한다.
            var tr0 = document.createElement("tr");
            tr0.className = "roster-empty";
            var td0 = document.createElement("td");
            td0.colSpan = cols.length || 1;
            if (needle) {
                // 검색어가 아무 글자로나 끝나므로 조사를 붙이지 않는다.
                td0.textContent = "\u201c" + String(filter || "").trim() + "\u201d 검색 결과 없음";
            } else if (!rows.length) {
                td0.appendChild(emptyReason());
            } else {
                td0.textContent = "검색 결과 없음";
            }
            tr0.appendChild(td0);
            tbody.appendChild(tr0);
        }
        // 인원 수만 적는다. 매수 합계까지 함께 적었더니 줄이 길어져
        // 정작 몇 명인지가 눈에 안 들어왔다.
        countEl.textContent = needle
            ? shown + " / " + rows.length + "명"
            : rows.length + "명";
    }

    // ── 체크인 ─────────────────────────────────────────────────────────
    // Postgres 는 timestamptz 를 마이크로초 6자리까지 붙여 준다
    // (2026-09-04T07:00:00.123456+00:00). 사파리는 소수점 이하가 3자리를
    // 넘으면 Invalid Date 를 내서 시각이 NaN:NaN 으로 찍힌다. 크롬은 관대해
    // 그냥 파싱되므로 크롬에서만 멀쩡해 보인다. 3자리로 잘라서 넘긴다.
    // 요청 하나에 시간 제한을 건다. 제한을 넘기면 abort 로 끊어서 catch 로
    // 떨어뜨린다. 그래야 기다리던 표시가 반드시 풀린다.
    function timeLimit(ms) {
        if (typeof AbortController === "undefined") {
            return { signal: undefined, clear: function () {} };
        }
        var ac = new AbortController();
        var t = setTimeout(function () { ac.abort(); }, ms);
        return { signal: ac.signal, clear: function () { clearTimeout(t); } };
    }

    function parseTs(iso) {
        if (!iso) return null;
        var t = String(iso)
            .replace(" ", "T")                        // 공백 구분자도 받는다
            .replace(/(\.\d{3})\d+/, "$1")             // .123456 -> .123
            .replace(/([+-]\d{2})$/, "$1:00");         // +00 -> +00:00
        var d = new Date(t);
        return isNaN(d.getTime()) ? null : d;
    }

    function hhmm(iso) {
        var d = parseTs(iso);
        if (!d) return "체크인됨";   // 시각을 못 읽어도 상태는 알려준다
        return String(d.getHours()).padStart(2, "0") + ":" +
               String(d.getMinutes()).padStart(2, "0");
    }

    function paintCheckIn(btn, row) {
        var on = !!row.checked_in_at;
        btn.className = "chk" + (on ? " chk-on" : "");
        btn.textContent = on ? hhmm(row.checked_in_at) : "체크인";
        // 눌린 뒤에는 무엇을 되돌리는 것인지 분명히 말해준다.
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.title = on
            ? row.name + " — " + hhmm(row.checked_in_at) + " 체크인됨. 누르면 취소합니다."
            : row.name + " 체크인";
    }

    function checkInButton(row) {
        var btn = document.createElement("button");
        btn.type = "button";
        paintCheckIn(btn, row);
        btn.addEventListener("click", function () {
            if (!token) return;
            var turningOn = !row.checked_in_at;
            // 되돌릴 때만 한 번 묻는다. 체크인은 다시 누르면 그만이지만,
            // 취소는 기록된 시각을 지우는 일이라 실수가 아깝다.
            if (!turningOn &&
                !window.confirm(row.name + " 체크인을 취소할까요? 기록된 시각이 지워집니다.")) {
                return;
            }
            btn.disabled = true;
            var prev = btn.textContent;
            btn.textContent = "…";
            // 저장이 오가는 동안에는 자동 갱신이 표를 새로 그리지 않게 막는다.
            writing++;
            writingAt = Date.now();
            var lim = timeLimit(REQ_TIMEOUT_MS);
            fetch(SUPABASE_URL + "/rest/v1/rpc/set_check_in", {
                method: "POST",
                signal: lim.signal,
                headers: {
                    apikey: SUPABASE_ANON,
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ p_id: row.id, p_on: turningOn })
            })
                .then(function (r) {
                    if (r.status === 401 || r.status === 403) throw new Error("DENIED");
                    return r.json().then(function (b) {
                        if (!r.ok) throw new Error(b.message || ("HTTP " + r.status));
                        return b;
                    });
                })
                .then(function (at) {
                    // 서버가 돌려준 시각을 그대로 쓴다. 브라우저 시계가 틀려도
                    // 표에 남는 값은 DB 가 정한 하나뿐이다.
                    //
                    // 내 화면이 낡아서 이미 찍힌 사람을 다시 눌렀다면, 서버는
                    // 먼저 찍힌 시각을 그대로 돌려준다(덮어쓰지 않는다).
                    // 그러면 여기서 그 시각이 그대로 들어와 화면이 사실과 맞는다.
                    row.checked_in_at = at;
                    paintCheckIn(btn, row);
                    vsay("");
                })
                .catch(function (err) {
                    btn.textContent = prev;
                    var m = String((err && err.message) || "");
                    vsay(/DENIED|42501|not an admin/i.test(m)
                        ? "체크인 권한이 없습니다."
                        : "체크인에 실패했습니다 (" + m + ").", "bad");
                })
                .finally(function () {
                    lim.clear();
                    btn.disabled = false;
                    if (writing > 0) writing--;
                    // 방금 손을 댄 참이니 그 김에 전체를 한 번 맞춘다.
                    // 옆 사람이 그 사이에 찍은 것도 같이 따라온다.
                    refresh();
                });
        });
        return btn;
    }

    // 서버가 한 줄도 주지 않았을 때. 명단이 진짜 비었을 수도 있지만, 훨씬
    // 흔한 것은 RLS 가 걸러낸 경우다 — 로그인한 이메일이 admin_emails 에
    // 없으면 서버는 오류 대신 빈 배열을 준다. 화면에서는 둘이 똑같이 보이므로
    // 무엇을 확인해야 하는지 적어 준다.
    function emptyReason() {
        var box = document.createElement("div");
        box.className = "empty-why";
        var who = whoEmail || (document.getElementById("who").textContent || "").trim();

        var h = document.createElement("b");
        h.textContent = "명단을 한 줄도 받지 못했습니다.";
        box.appendChild(h);

        var p = document.createElement("p");
        p.textContent = "서버는 정상으로 답했지만 내용이 비어 있습니다. " +
            "명단이 실제로 비었거나, 이 계정에 열람 권한이 없어 걸러졌을 수 있습니다.";
        box.appendChild(p);

        var ul = document.createElement("ul");
        [
            "지금 로그인한 계정: " + (who || "(알 수 없음)"),
            "Supabase 의 admin_emails 표에 위 주소가 그대로 들어 있는지 확인하세요.",
            "roster 표에 실제로 줄이 있는지 대시보드에서 확인하세요."
        ].forEach(function (t) {
            var li = document.createElement("li");
            li.textContent = t;
            ul.appendChild(li);
        });
        box.appendChild(ul);
        return box;
    }

    function drawHead() {
        theadRow.textContent = "";
        cols.forEach(function (c) {
            var th = document.createElement("th");
            th.textContent = LABEL[c] || c;
            theadRow.appendChild(th);
        });
    }

    // ── 명단 받기 ──────────────────────────────────────────────────────
    // 명단은 처음 열 때 통째로 받아 둔다. 300명 남짓이라 한 번에 받아도
    // 가볍고, 그 뒤 검색은 서버를 다시 부르지 않아 현장에서 빠르다.
    // 다만 PostgREST 에는 행 수 상한이 있어 넘치면 조용히 잘린다. 범위를
    // 넉넉히 적어 두고, 서버가 알려주는 총계와 받은 수를 견줘 확인한다.
    var FETCH_MAX = 2000;
    var gotCount = 0, totalCount = null;

    function loadRoster() {
        var lim = timeLimit(REQ_TIMEOUT_MS);
        return fetch(
            SUPABASE_URL + "/rest/v1/" + TABLE + "?select=*&order=name.asc",
            {
                cache: "no-store",
                signal: lim.signal,
                headers: {
                    apikey: SUPABASE_ANON,
                    Authorization: "Bearer " + token,
                    Accept: "application/json",
                    // 0-1999. 총계를 함께 달라고 해서 잘렸는지 판정한다.
                    Range: "0-" + (FETCH_MAX - 1),
                    "Range-Unit": "items",
                    Prefer: "count=exact"
                }
            }
        ).then(function (r) {
            if (r.status === 401 || r.status === 403) throw new Error("DENIED");
            // 206 은 부분 응답이다. 범위를 줬으니 정상이다.
            if (!r.ok && r.status !== 206) throw new Error("HTTP " + r.status);
            var cr = r.headers.get("content-range");     // 예: 0-299/300
            var total = null;
            if (cr) {
                var t = cr.split("/")[1];
                if (t && t !== "*") total = parseInt(t, 10);
            }
            return r.json().then(function (list) {
                totalCount = total;
                gotCount = (list && list.length) || 0;
                return list;
            });
        }).then(function (list) {
            rows = list || [];
            // 돌아온 칸을 그대로 쓴다. DB 에서 칸을 더하거나 빼도 여기는 안 고친다.
            // 한 줄도 없으면 무엇이 올 자리인지 알 수 없으므로 기본 칸을 세워 둔다.
            cols = rows.length
                ? orderCols(Object.keys(rows[0]).filter(function (c) { return HIDE.indexOf(c) === -1; }))
                : ORDER.slice();
            drawHead();
            render(q.value);
            // 잘렸으면 실제 숫자를 그대로 적는다. 우리가 건 상한(2000)보다
            // 적은데도 잘렸다면 서버 쪽 Max rows 설정이 원인이므로, 어디를
            // 봐야 하는지까지 알려준다.
            var when = "받은 시각 " + new Date().toLocaleString("ko-KR");
            document.getElementById("fetched").textContent =
                (totalCount != null && gotCount < totalCount)
                    ? when + " — 명단 " + totalCount + "명 중 " + gotCount +
                      "명만 받았습니다. Supabase 의 Max rows 설정을 확인하세요."
                    : when;
        }).finally(function () { lim.clear(); });
    }

    // ── 자동 갱신 ──────────────────────────────────────────────────────
    // 접수대에 여러 명이 서서 각자 자기 화면으로 체크인한다. 갱신이 없으면
    // 옆 사람이 방금 찍은 것이 내 화면에 안 보여서, 같은 사람을 또 들여보내거나
    // 이미 찍힌 시각을 덮어쓰게 된다.
    //
    // 조용히 돈다. 실패해도 화면에 오류를 띄우지 않는다 - 지하나 엘리베이터에서
    // 잠깐 끊기는 것은 흔한 일이고, 다음 차례에 다시 받으면 그만이다.
    // 다만 권한이 끊긴 것(401/403)은 다음 차례에도 안 풀리므로 그때는 잠근다.
    // 받는 중이면 0 이 아닌, 시작한 시각. 참/거짓 하나로 두면 요청이 매달렸을 때
    // 영영 '받는 중' 으로 남아 자동 갱신이 죽는다. 시각으로 두면 스스로 풀린다.
    var loadingAt = 0;

    // 지금 저장 중인가. 너무 오래 붙들려 있으면 잘못 남은 것으로 보고 푼다.
    function busyWriting() {
        if (writing <= 0) return false;
        if (Date.now() - writingAt > STUCK_MS) { writing = 0; return false; }
        return true;
    }

    function refresh() {
        if (!token) return Promise.resolve();
        // 이미 받는 중이면 겹쳐 부르지 않는다. 겹치면 늦게 떠난 요청이 먼저
        // 도착해 낡은 명단이 새 명단을 덮는 일이 생긴다.
        if (loadingAt && Date.now() - loadingAt < STUCK_MS) return Promise.resolve();
        // 저장 중이면 건너뛴다. 지금 표를 새로 그리면 누르고 있는 단추가
        // 통째로 사라진다.
        if (busyWriting()) return Promise.resolve();
        // 화면이 안 보이면 받을 이유가 없다. 배터리만 쓴다.
        if (document.hidden) return Promise.resolve();
        loadingAt = Date.now();
        return loadRoster().catch(function (err) {
            if (/DENIED/.test(String((err && err.message) || ""))) {
                logout();
                say("로그인이 만료되었습니다. 다시 로그인해 주세요.");
            }
            // 그 밖의 실패는 삼킨다. #fetched 의 '받은 시각' 이 안 바뀌는 것으로
            // 무언가 멈췄다는 것이 드러난다.
        }).finally(function () { loadingAt = 0; });
    }

    function startPolling() {
        stopPolling();
        pollTimer = setInterval(refresh, POLL_MS);
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function openVault(userEmail) {
        document.getElementById("who").textContent = userEmail;
        gate.hidden = true;
        vault.hidden = false;
        startIdle();
        startPolling();
        paintUntil();
        q.focus();
    }

    // ── 유휴 잠금 ──────────────────────────────────────────────────────
    // 1초마다 남은 시간을 보고 화면에 알린다. 타이머로 한 번에 재우지 않는
    // 이유는, 휴대폰이 절전에 들어가면 타이머가 밀려 훨씬 늦게 깨기 때문이다.
    // 시각을 직접 비교하면 절전에서 돌아온 순간 바로 판정된다.
    var idleBar = document.getElementById("idle");
    var idleLeft = document.getElementById("idle-left");

    function touch() {
        lastSeen = Date.now();
        if (idleBar && !idleBar.hidden) idleBar.hidden = true;
    }

    // 접속이 언제 끝나는지 적는다. 남은 시간이 아니라 '몇 시까지' 로 적는다.
    // 접수대에서 필요한 판단은 "지금 다시 로그인해 둘까" 하나뿐인데, 시계를
    // 보고 바로 답이 나오는 쪽이 카운트다운보다 낫다.
    var untilEl = document.getElementById("until");
    var untilShown = "";
    function paintUntil() {
        if (!untilEl) return;
        if (!token || !tokenExp) { untilEl.hidden = true; untilShown = ""; return; }
        var left = tokenExp - Date.now();
        var end = new Date(tokenExp);
        var t = end.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
        // 접속이 12시간이면 저녁에 로그인한 사람의 끝나는 시각은 다음 날 새벽이다.
        // 그냥 '오전 6:06까지' 라고만 적으면 이미 지난 시각으로 읽힌다.
        // 날짜가 넘어가면 반드시 밝힌다.
        var d0 = new Date(); d0.setHours(0, 0, 0, 0);
        var days = Math.floor((end - d0) / 86400000);
        var when = days <= 0 ? t
                 : days === 1 ? "내일 " + t
                 : days === 2 ? "모레 " + t
                 : end.toLocaleString("ko-KR",
                     { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
        var text = left <= 30 * 60 * 1000
            ? "접속이 " + when + "에 끝납니다 — 지금 다시 로그인해 두세요"
            : when + "까지 사용할 수 있습니다";
        // 1초마다 불리므로 글이 그대로면 손대지 않는다.
        if (text !== untilShown) {
            untilEl.textContent = text;
            untilShown = text;
        }
        untilEl.hidden = false;
        untilEl.classList.toggle("until-soon", left <= 30 * 60 * 1000);
    }

    function idleTick() {
        if (!token) return;
        paintUntil();
        var idle = Date.now() - lastSeen;
        var left = IDLE_MS - idle;
        if (left <= 0) {
            logout();
            say("30분 동안 사용이 없어 잠겼습니다. 다시 로그인해 주세요.");
            return;
        }
        if (idleBar) {
            if (left <= WARN_MS) {
                idleBar.hidden = false;
                idleLeft.textContent = Math.ceil(left / 1000);
            } else if (!idleBar.hidden) {
                idleBar.hidden = true;
            }
        }
    }

    function startIdle() {
        touch();
        if (idleTimer) clearInterval(idleTimer);
        idleTimer = setInterval(idleTick, 1000);
    }

    function stopIdle() {
        if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
        if (idleBar) idleBar.hidden = true;
    }

    // 보고만 있는 것은 활동이 아니다. 실제로 손을 댄 것만 센다.
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) {
        document.addEventListener(ev, function () { if (token) touch(); },
            { passive: true, capture: true });
    });
    // 다른 앱에 갔다가 돌아온 순간에도 바로 판정한다. 자리를 비운 사이에
    // 옆 사람이 찍은 것이 있으므로 명단도 그 자리에서 다시 받는다.
    // 15초를 기다리게 하면 돌아오자마자 낡은 화면을 보고 손을 대게 된다.
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) return;
        idleTick();
        refresh();
    });
    if (idleBar) {
        idleBar.querySelector("button").addEventListener("click", touch);
    }

    function logout() {
        // 서버에도 알려 토큰을 무효화한다. 실패해도 화면은 잠근다.
        if (token) {
            // scope=local 을 반드시 붙인다. 붙이지 않으면 Supabase 는 이 계정의
            // 모든 자리를 한꺼번에 끊는다(global 이 기본값). 접수대 다섯이 같은
            // admin 계정을 나눠 쓰는데, 한 사람이 자기 화면을 잠갔다고 나머지
            // 넷이 같이 끊기면 안 된다.
            fetch(SUPABASE_URL + "/auth/v1/logout?scope=local", {
                method: "POST",
                headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token }
            }).catch(function () {});
        }
        stopIdle();
        stopPolling();
        clearSession();
        token = null;
        whoEmail = "";
        tokenExp = 0;
        paintUntil();
        rows = [];
        cols = ORDER.slice();
        tbody.textContent = "";
        drawHead();
        q.value = "";
        pass.value = "";
        vault.hidden = true;
        gate.hidden = false;
        vsay("");
        say("");
        email.focus();
    }

    // 로그인하기 전에 미리 그려 둔다. 금고가 열리는 순간 표가 이미 서 있다.
    drawHead();

    // 치는 대로 걸러진다. 데스크톱에서는 이것만으로 충분하다.
    q.addEventListener("input", function () { if (token) render(q.value); });

    // 한글은 자모를 모아 한 글자를 만드는 동안 조합 상태로 있다. 사파리는
    // 조합이 끝날 때 input 을 한 번 더 주지 않는 경우가 있어, 마지막 조각으로
    // 거른 결과가 그대로 남는다. 조합이 끝나는 순간을 따로 잡아 다시 그린다.
    q.addEventListener("compositionend", function () { if (token) render(q.value); });
    // 사파리의 검색칸 X 단추는 input 대신 search 를 준다.
    q.addEventListener("search", function () { if (token) render(q.value); });

    // 휴대폰에서는 키보드가 화면 절반을 덮어 결과가 안 보인다. 조회를 누르거나
    // 키보드의 검색 키를 치면 입력칸에서 초점을 떼어 키보드를 내린다.
    function doFind() {
        if (token) render(q.value);
        q.blur();
    }

    document.getElementById("find-form").addEventListener("submit", function (e) {
        e.preventDefault();
        doFind();
    });

    // 단추에도 직접 손잡이를 단다. 폼 submit 이 오지 않는 브라우저가 있어도
    // 누른 것은 눌린 대로 동작해야 한다. 둘 다 오면 같은 일을 두 번 하는데,
    // 거르는 일이라 결과가 달라지지 않는다.
    document.getElementById("find").addEventListener("click", function (e) {
        e.preventDefault();
        doFind();
    });
    document.getElementById("lock").addEventListener("click", logout);
    document.getElementById("reload").addEventListener("click", function () {
        loadRoster().catch(function (err) {
            if (err && err.message === "DENIED") {
                say("접속 시간이 지났습니다. 다시 로그인해 주세요.", "bad");
                logout();
            }
        });
    });

    // ── 로그인 ─────────────────────────────────────────────────────────
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!email.value || !pass.value) return;

        go.disabled = true;
        say("확인 중…");

        fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
            method: "POST",
            headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
            body: JSON.stringify({ email: toEmail(email.value), password: pass.value })
        })
            .then(function (r) {
                return r.json().then(function (body) {
                    if (!r.ok) throw new Error(body.error_description || body.msg || "LOGIN");
                    return body;
                });
            })
            .then(function (session) {
                token = session.access_token;
                whoEmail = (session.user && session.user.email) || "";
                saveSession(session);
                // 비밀번호는 더 쓸 일이 없다. 입력칸에 남기면 개발자도구나
                // 자동완성에 그대로 노출된다.
                pass.value = "";
                return loadRoster().then(function () {
                    if (!rows.length) {
                        // 로그인은 됐는데 한 줄도 없다. 표가 비었거나,
                        // admin_emails 에 이 이메일이 없어 RLS 가 걸렀거나.
                        say("");
                        openVault(session.user && session.user.email);
                        countEl.textContent = "0명";
                        document.getElementById("fetched").textContent =
                            "받은 줄이 없습니다. 명단이 비었거나, 이 계정이 admin_emails 에 없을 수 있습니다.";
                        return;
                    }
                    say("");
                    openVault(session.user && session.user.email);
                });
            })
            .catch(function (err) {
                var m = String((err && err.message) || "");
                if (m === "DENIED") {
                    say("이 계정에는 열람 권한이 없습니다.", "bad");
                } else if (m.indexOf("HTTP") === 0) {
                    say("후원자 명단을 받아오지 못했습니다 (" + m + ").", "bad");
                } else if (/provider.*disabled|logins? are disabled/i.test(m)) {
                    // Supabase 에서 Email 제공자 자체를 꺼두면 로그인도 막힌다.
                    // 가입만 막으려다 제공자를 통째로 끄는 실수가 흔해, 이 경우를
                    // 따로 알린다. 비밀번호 탓으로 안내하면 엉뚱한 곳을 뒤지게 된다.
                    say("서버에서 이메일 로그인이 꺼져 있습니다. Supabase 의 Email 제공자를 켜고, 가입만 막아 주세요.", "bad");
                } else if (/invalid.?login|invalid_grant|^LOGIN$/i.test(m)) {
                    say("아이디 또는 비밀번호가 맞지 않습니다.", "bad");
                } else {
                    say(m || "로그인에 실패했습니다.", "bad");
                }
                token = null;
                pass.select();
            })
            .finally(function () { go.disabled = false; });
    });

    // ── 새로고침 뒤 되살리기 ───────────────────────────────────────────
    // 저장된 토큰이 아직 살아 있으면 로그인 화면을 건너뛴다. 토큰이 진짜
    // 유효한지는 서버가 판정한다 — 명단을 받아보고 거절당하면 그때 지운다.
    (function restore() {
        var saved = readSession();
        if (!saved) { email.focus(); return; }

        token = saved.t;
        whoEmail = saved.e || "";
        tokenExp = saved.x || 0;
        say("이어서 여는 중…");
        go.disabled = true;
        loadRoster()
            .then(function () {
                say("");
                openVault(saved.e);
            })
            .catch(function (err) {
                // 서버가 거절했으면 저장된 것이 쓸모없다. 깨끗이 지우고
                // 로그인 화면으로 되돌린다.
                token = null;
                clearSession();
                var m = String((err && err.message) || "");
                say(m === "DENIED"
                    ? "접속 시간이 지났습니다. 다시 로그인해 주세요."
                    : "", m === "DENIED" ? "bad" : "");
                email.focus();
            })
            .finally(function () { go.disabled = false; });
    })();
})();
