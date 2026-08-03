// 게시판 — Supabase REST 백엔드. anon 키는 공개용이라 클라이언트 노출이 정상입니다.
(function () {
  // Supabase (anon 키는 공개용 — 정적 사이트 노출 정상, RLS가 데이터 보호)
  var SUPABASE_URL = "https://farunkdduzolqgcgxqmj.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnVua2RkdXpvbHFnY2d4cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgwNjAsImV4cCI6MjEwMTI3NDA2MH0.HdzWaXH8XvokiBJBQ8r5_fc6TjZOCQB86IbvBG9PFaA";

  var form = document.getElementById("gb-form");
  if (!form) return;
  var list = document.getElementById("gb-list");
  var nameEl = document.getElementById("gb-name");
  var msgEl = document.getElementById("gb-message");
  var countEl = document.getElementById("gb-count");
  var statusEl = document.getElementById("gb-status");
  var submitEl = document.getElementById("gb-submit");

  var REST = SUPABASE_URL + "/rest/v1/posts";
  var authHeaders = { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };

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

  function render(posts) {
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

  function load() {
    fetch(REST + "?select=id,created_at,name,message&order=created_at.desc&limit=100", { headers: authHeaders })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () {
        list.innerHTML = '<li class="gb-empty">글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</li>';
      });
  }

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
        load();
      })
      .catch(function () { setStatus("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.", "err"); })
      .finally(function () { submitEl.disabled = false; });
  });

  msgEl.addEventListener("input", function () {
    countEl.textContent = msgEl.value.length + " / 500";
  });

  load();
})();
