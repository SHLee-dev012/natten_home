// 게시판 — Supabase REST 백엔드. anon 키는 공개용이라 클라이언트 노출이 정상입니다.
(function () {
  // Supabase (anon 키는 공개용 — 정적 사이트 노출 정상, RLS가 데이터 보호)
  var SUPABASE_URL = "https://farunkdduzolqgcgxqmj.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnVua2RkdXpvbHFnY2d4cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgwNjAsImV4cCI6MjEwMTI3NDA2MH0.HdzWaXH8XvokiBJBQ8r5_fc6TjZOCQB86IbvBG9PFaA";
  var PAGE_SIZE = 10;

  var form = document.getElementById("gb-form");
  if (!form) return;
  var list = document.getElementById("gb-list");
  var pager = document.getElementById("gb-pager");
  var nameEl = document.getElementById("gb-name");
  var msgEl = document.getElementById("gb-message");
  var countEl = document.getElementById("gb-count");
  var statusEl = document.getElementById("gb-status");
  var submitEl = document.getElementById("gb-submit");

  var REST = SUPABASE_URL + "/rest/v1/posts";
  var authHeaders = { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };
  var page = 1, totalCount = 0;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }
  function timeago(iso) {
    var t = new Date(iso), sec = Math.floor((Date.now() - t.getTime()) / 1000);
    if (isNaN(sec)) return "";
    if (sec < 60) return "방금 전";
    if (sec < 3600) return Math.floor(sec / 60) + "분 전";
    if (sec < 86400) return Math.floor(sec / 3600) + "시간 전";
    return (t.getMonth() + 1) + "월 " + t.getDate() + "일";
  }
  function setStatus(msg, kind) {
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.className = "gb-status" + (kind ? " gb-status--" + kind : "");
  }

  function renderPosts(posts) {
    if (!posts.length) {
      list.innerHTML = '<li class="gb-empty">아직 글이 없어요. 첫 글을 남겨보세요!</li>';
      return;
    }
    list.innerHTML = posts.map(function (p) {
      return '<li class="gb-item">' +
        '<div class="gb-item-top">' +
          '<span class="gb-item-name">' + esc(p.name || "익명") + '</span>' +
          '<span class="gb-item-time">' + esc(timeago(p.created_at)) + '</span>' +
        '</div>' +
        '<p class="gb-item-msg">' + esc(p.message) + '</p>' +
      '</li>';
    }).join("");
  }

  // 페이지 번호 배열 (많으면 … 로 축약): [1, '…', 4, 5, 6, '…', 12]
  function pageList(cur, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var res = [1];
    var start = Math.max(2, cur - 1), end = Math.min(total - 1, cur + 1);
    if (start > 2) res.push("…");
    for (var j = start; j <= end; j++) res.push(j);
    if (end < total - 1) res.push("…");
    res.push(total);
    return res;
  }

  function renderPager() {
    var totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (totalPages <= 1) { pager.innerHTML = ""; pager.hidden = true; return; }
    pager.hidden = false;
    var html = '<button type="button" class="gb-page-nav" data-go="' + (page - 1) + '"' +
      (page <= 1 ? " disabled" : "") + ' aria-label="이전 페이지">‹</button>';
    pageList(page, totalPages).forEach(function (n) {
      if (n === "…") { html += '<span class="gb-ellipsis">…</span>'; return; }
      html += '<button type="button" data-go="' + n + '"' +
        (n === page ? ' aria-current="page"' : "") + '>' + n + '</button>';
    });
    html += '<button type="button" class="gb-page-nav" data-go="' + (page + 1) + '"' +
      (page >= totalPages ? " disabled" : "") + ' aria-label="다음 페이지">›</button>';
    pager.innerHTML = html;
  }

  function fetchPage(p) {
    var offset = (p - 1) * PAGE_SIZE;
    var url = REST + "?select=id,created_at,name,message&order=created_at.desc" +
      "&limit=" + PAGE_SIZE + "&offset=" + offset;
    return fetch(url, { headers: Object.assign({ Prefer: "count=exact" }, authHeaders) })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        var cr = r.headers.get("content-range"); // 예: "0-9/14"
        if (cr) {
          var tot = cr.split("/")[1];
          totalCount = (!tot || tot === "*") ? 0 : (parseInt(tot, 10) || 0);
        }
        return r.json();
      });
  }

  function load(p, scroll) {
    page = p;
    list.setAttribute("aria-busy", "true");
    fetchPage(p)
      .then(function (posts) {
        renderPosts(posts);
        renderPager();
        list.removeAttribute("aria-busy");
        if (scroll) {
          var top = document.getElementById("guestbook");
          if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      })
      .catch(function () {
        list.innerHTML = '<li class="gb-empty">글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</li>';
        pager.innerHTML = ""; pager.hidden = true;
      });
  }

  pager.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-go]");
    if (!btn || btn.disabled) return;
    var p = parseInt(btn.getAttribute("data-go"), 10);
    if (p && p !== page) load(p, true);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var message = msgEl.value.trim();
    if (!message) { setStatus("내용을 입력해 주세요.", "err"); msgEl.focus(); return; }
    var name = nameEl.value.trim().slice(0, 20) || "익명";
    submitEl.disabled = true;
    setStatus("등록 중…");
    fetch(REST, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=minimal" }, authHeaders),
      body: JSON.stringify({ name: name, message: message.slice(0, 500) })
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        msgEl.value = "";
        countEl.textContent = "0 / 500";
        setStatus("등록되었습니다 ✓", "ok");
        load(1); // 최신 글이 있는 첫 페이지로
      })
      .catch(function () { setStatus("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.", "err"); })
      .finally(function () { submitEl.disabled = false; });
  });

  msgEl.addEventListener("input", function () {
    countEl.textContent = msgEl.value.length + " / 500";
  });

  load(1);
})();
