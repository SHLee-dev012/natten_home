// 관리자 열람 — Supabase 로그인으로 명단을 받아온다.
//
// 이 페이지에는 명단이 실려 있지 않다. 로그인해서 받은 토큰으로 DB 에 물어보고,
// 권한 판단은 DB 가 한다(roster 표의 RLS 정책, db/admin-roster.sql 참고).
// 권한이 없으면 서버가 빈 배열을 내주므로, 브라우저 코드를 아무리 고쳐도
// 남의 명단을 볼 수 없다. 앞서 쓰던 '빌드 때 암호화' 방식과 다른 점이 이것이다 —
// 그쪽은 암호문이 공개 주소에 올라가 오프라인으로 뒤질 수 있었다.
//
// 토큰은 이 탭의 메모리에만 둔다. localStorage 에 넣으면 XSS 한 번에 통째로
// 털리고, 새로고침해도 남아 있어 공용 PC 에서 위험하다. 새로고침하면 다시
// 로그인하는 쪽이 낫다.
(function () {
    "use strict";

    // 게시판(board.js)과 같은 프로젝트. anon 키는 공개용이라 노출이 정상이며,
    // 이 키만으로는 roster 를 읽을 수 없다(RLS 가 막는다).
    var SUPABASE_URL = "https://farunkdduzolqgcgxqmj.supabase.co";
    var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnVua2RkdXpvbHFnY2d4cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgwNjAsImV4cCI6MjEwMTI3NDA2MH0.HdzWaXH8XvokiBJBQ8r5_fc6TjZOCQB86IbvBG9PFaA";

    var TABLE = "roster";
    // Supabase Auth 는 로그인 식별자로 이메일을 요구한다. 화면에서는 아이디만
    // 받고 여기서 도메인을 붙인다 — 쓰는 사람에게는 'admin' 한 단어이고,
    // DB 에는 admin@knotsun.kr 계정이다. '@' 가 들어오면 그대로 쓴다.
    var LOGIN_DOMAIN = "@knotsun.kr";
    // 화면에 내보내지 않을 칸. 있어도 굳이 보여줄 이유가 없다.
    var HIDE = ["id", "created_at"];
    // 보기 좋은 이름. 표에 없는 칸은 원래 이름 그대로 나온다.
    var LABEL = {
        name: "이름", cohort: "기수", kind: "구분",
        phone_last4: "전화 뒤4", applied_on: "신청일", memo: "비고"
    };

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
    var cols = [];
    var rows = [];

    function say(text, kind) {
        msg.textContent = text;
        msg.className = "msg" + (kind ? " msg-" + kind : "");
    }

    // ── 표 그리기 ──────────────────────────────────────────────────────
    function render(filter) {
        var needle = (filter || "").trim().toLowerCase();
        tbody.textContent = "";
        var shown = 0;
        rows.forEach(function (row) {
            var hay = cols.map(function (c) { return row[c] == null ? "" : row[c]; }).join(" ");
            if (needle && hay.toLowerCase().indexOf(needle) === -1) return;
            var tr = document.createElement("tr");
            cols.forEach(function (c) {
                var td = document.createElement("td");
                td.textContent = row[c] == null ? "" : String(row[c]);
                td.setAttribute("data-label", LABEL[c] || c);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
            shown++;
        });
        countEl.textContent = needle ? shown + " / " + rows.length + "명" : rows.length + "명";
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
    function loadRoster() {
        return fetch(
            SUPABASE_URL + "/rest/v1/" + TABLE + "?select=*&order=name.asc",
            {
                cache: "no-store",
                headers: {
                    apikey: SUPABASE_ANON,
                    Authorization: "Bearer " + token,
                    Accept: "application/json"
                }
            }
        ).then(function (r) {
            if (r.status === 401 || r.status === 403) throw new Error("DENIED");
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        }).then(function (list) {
            rows = list || [];
            // 돌아온 칸을 그대로 쓴다. DB 에서 칸을 더하거나 빼도 여기는 안 고친다.
            cols = rows.length
                ? Object.keys(rows[0]).filter(function (c) { return HIDE.indexOf(c) === -1; })
                : [];
            drawHead();
            render(q.value);
            document.getElementById("fetched").textContent =
                "받은 시각 " + new Date().toLocaleString("ko-KR");
        });
    }

    function openVault(userEmail) {
        document.getElementById("who").textContent = userEmail;
        gate.hidden = true;
        vault.hidden = false;
        q.focus();
    }

    function logout() {
        // 서버에도 알려 토큰을 무효화한다. 실패해도 화면은 잠근다.
        if (token) {
            fetch(SUPABASE_URL + "/auth/v1/logout", {
                method: "POST",
                headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token }
            }).catch(function () {});
        }
        token = null;
        rows = [];
        cols = [];
        tbody.textContent = "";
        theadRow.textContent = "";
        q.value = "";
        pass.value = "";
        vault.hidden = true;
        gate.hidden = false;
        say("");
        email.focus();
    }

    q.addEventListener("input", function () { if (token) render(q.value); });
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
                    say("명단을 받아오지 못했습니다 (" + m + ").", "bad");
                } else if (/Invalid login|invalid_grant|LOGIN/i.test(m)) {
                    say("아이디 또는 비밀번호가 맞지 않습니다.", "bad");
                } else {
                    say(m || "로그인에 실패했습니다.", "bad");
                }
                token = null;
                pass.select();
            })
            .finally(function () { go.disabled = false; });
    });

    email.focus();
})();
