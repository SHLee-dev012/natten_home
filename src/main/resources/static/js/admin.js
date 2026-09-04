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
    // 손을 안 대면 잠근다. 검색이 서버를 부르지 않아 토큰이 만료돼도 화면의
    // 명단은 그대로 남는다 — 접수대에 폰을 두고 자리를 비우면 누구나 본다.
    // 그 구멍을 메우는 장치다.
    var IDLE_MS = 30 * 60 * 1000;   // 30분
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
        drink_qty: "음료권", food_qty: "푸드권",
        phone_last4: "전화 뒤4", applied_on: "신청일", memo: "비고"
    };
    // 표시 순서. DB 에 칸을 더하면 맨 뒤에 붙는데, 읽는 순서는 그것과 다르다
    // (매수는 구분 바로 옆에 있어야 한다). 여기 적힌 차례로 앞세우고,
    // 적히지 않은 칸은 뒤에 원래 순서대로 붙는다 — 그래서 DB 에 칸을 새로
    // 더해도 화면이 깨지지 않는다.
    var ORDER = ["name", "phone_last4", "kind",
                 "day_qty", "all_qty", "drink_qty", "food_qty",
                 "cohort"];
    // 합계를 낼 칸. 현장에서 몇 장을 내줘야 하는지가 바로 보여야 한다.
    var SUM = ["day_qty", "all_qty", "drink_qty", "food_qty"];
    // 검색이 훑을 칸. 사람을 특정하는 값만 본다.
    // 기수와 구분은 여러 사람이 같은 값을 가져서, 넣으면 "낯5" 한 번에 수십
    // 명이 걸려 오히려 찾기 어려워진다. 매수는 숫자라 "2" 로 거의 다 걸린다.
    var SEARCH = ["name", "phone_last4"];

    function orderCols(keys) {
        var known = [], rest = [];
        keys.forEach(function (k) { (ORDER.indexOf(k) >= 0 ? known : rest).push(k); });
        known.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
        return known.concat(rest);
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

    // ── 표 그리기 ──────────────────────────────────────────────────────
    function render(filter) {
        var needle = (filter || "").trim().toLowerCase();
        tbody.textContent = "";
        var shown = 0, shownRows = [];
        rows.forEach(function (row) {
            var hay = SEARCH.map(function (c) { return row[c] == null ? "" : row[c]; }).join(" ");
            if (needle && hay.toLowerCase().indexOf(needle) === -1) return;
            var tr = document.createElement("tr");
            cols.forEach(function (c) {
                var td = document.createElement("td");
                td.textContent = row[c] == null ? "" : String(row[c]);
                td.setAttribute("data-label", LABEL[c] || c);
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
            shownRows.push(row);
            shown++;
        });
        if (!shown) {
            // 빈 표는 고장난 것처럼 보인다. 왜 비었는지 한 줄로 알려준다.
            var tr0 = document.createElement("tr");
            tr0.className = "roster-empty";
            var td0 = document.createElement("td");
            td0.colSpan = cols.length || 1;
            // 검색어가 아무 글자로나 끝나므로 조사를 붙이지 않는다.
            // "없는이름 로" 처럼 받침에 안 맞는 조사가 나오는 것을 피한다.
            td0.textContent = needle
                ? "\u201c" + filter.trim() + "\u201d 검색 결과가 없습니다."
                : "아직 받은 줄이 없습니다.";
            tr0.appendChild(td0);
            tbody.appendChild(tr0);
        }
        var head = needle ? shown + " / " + rows.length + "명" : rows.length + "명";
        // 보이는 줄만 더한다. 검색으로 좁히면 그 사람들 몫만 나온다.
        var totals = SUM.filter(function (c) { return cols.indexOf(c) >= 0; })
            .map(function (c) {
                var n = 0;
                shownRows.forEach(function (row) { n += Number(row[c]) || 0; });
                return (LABEL[c] || c) + " " + n;
            });
        countEl.textContent = totals.length ? head + " · " + totals.join(" · ") : head;
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
            // 한 줄도 없으면 무엇이 올 자리인지 알 수 없으므로 기본 칸을 세워 둔다.
            cols = rows.length
                ? orderCols(Object.keys(rows[0]).filter(function (c) { return HIDE.indexOf(c) === -1; }))
                : ORDER.slice();
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
        startIdle();
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

    function idleTick() {
        if (!token) return;
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
    // 다른 앱에 갔다가 돌아온 순간에도 바로 판정한다.
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) idleTick();
    });
    if (idleBar) {
        idleBar.querySelector("button").addEventListener("click", touch);
    }

    function logout() {
        // 서버에도 알려 토큰을 무효화한다. 실패해도 화면은 잠근다.
        if (token) {
            fetch(SUPABASE_URL + "/auth/v1/logout", {
                method: "POST",
                headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + token }
            }).catch(function () {});
        }
        stopIdle();
        token = null;
        rows = [];
        cols = ORDER.slice();
        tbody.textContent = "";
        drawHead();
        q.value = "";
        pass.value = "";
        vault.hidden = true;
        gate.hidden = false;
        say("");
        email.focus();
    }

    // 로그인하기 전에 미리 그려 둔다. 금고가 열리는 순간 표가 이미 서 있다.
    drawHead();

    // 치는 대로 걸러진다. 데스크톱에서는 이것만으로 충분하다.
    q.addEventListener("input", function () { if (token) render(q.value); });

    // 휴대폰에서는 키보드가 화면 절반을 덮어 결과가 안 보인다. 조회를 누르거나
    // 키보드의 검색 키를 치면 입력칸에서 초점을 떼어 키보드를 내린다.
    document.getElementById("find-form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (token) render(q.value);
        q.blur();
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

    email.focus();
})();
