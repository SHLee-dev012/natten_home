// 게시판 — Supabase REST + RPC 백엔드. anon 키는 공개용이라 클라이언트 노출이 정상입니다.
// 수정/삭제는 비밀번호를 검증하는 DB 함수(RPC)를 통해서만 처리됩니다.
(function () {
  var SUPABASE_URL = "https://farunkdduzolqgcgxqmj.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnVua2RkdXpvbHFnY2d4cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTgwNjAsImV4cCI6MjEwMTI3NDA2MH0.HdzWaXH8XvokiBJBQ8r5_fc6TjZOCQB86IbvBG9PFaA";
  var PAGE_SIZE = 10;

  var form = document.getElementById("gb-form");
  if (!form) return;
  var list = document.getElementById("gb-list");
  var pager = document.getElementById("gb-pager");
  var nameEl = document.getElementById("gb-name");
  var titleEl = document.getElementById("gb-title");
  var msgEl = document.getElementById("gb-message");
  var pwEl = document.getElementById("gb-password");
  var countEl = document.getElementById("gb-count");
  var statusEl = document.getElementById("gb-status");
  var submitEl = document.getElementById("gb-submit");
  var modalEl = document.getElementById("gb-modal");
  var writeBtn = document.getElementById("gb-write");
  var flashEl = document.getElementById("gb-flash");
  var totalEl = document.getElementById("gb-total");

  var REST = SUPABASE_URL + "/rest/v1/posts";
  var RPC = SUPABASE_URL + "/rest/v1/rpc/";
  var authHeaders = { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };
  var page = 1, totalCount = 0, currentPosts = [];

  // 비밀번호 시도 제한 (같은 글 MAX_TRY회 실패 → LOCK_MS 잠금). localStorage 저장.
  var MAX_TRY = 5, LOCK_MS = 30000;
  function failKey(id) { return "gb_fail_" + id; }
  function getFail(id) { try { return JSON.parse(localStorage.getItem(failKey(id))) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
  function lockRemain(id) { var f = getFail(id); return (f.until && Date.now() < f.until) ? Math.ceil((f.until - Date.now()) / 1000) : 0; }
  function recordFail(id) {
    var f = getFail(id); f.n = (f.n || 0) + 1;
    if (f.n >= MAX_TRY) { f.until = Date.now() + LOCK_MS; f.n = 0; }
    try { localStorage.setItem(failKey(id), JSON.stringify(f)); } catch (e) {}
  }
  function clearFail(id) { try { localStorage.removeItem(failKey(id)); } catch (e) {} }
  function lockMsg(id) { var r = lockRemain(id); return r ? ("시도가 많습니다. " + r + "초 후 다시 시도해 주세요.") : ""; }

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
  var flashTimer = null;
  function flash(msg) {
    if (!flashEl) return;
    flashEl.hidden = false;
    flashEl.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { flashEl.hidden = true; }, 4000);
  }

  // 작성 모달 — 목록은 본문에, 신규 작성은 모달에서
  var lastFocus = null;
  function openModal() {
    if (!modalEl) return;
    lastFocus = document.activeElement;
    setStatus("");
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(function () { titleEl.focus(); }, 60);
  }
  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (writeBtn) writeBtn.addEventListener("click", openModal);
  if (modalEl) {
    modalEl.querySelectorAll("[data-gbclose]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalEl.classList.contains("open")) closeModal();
    });
  }

  function rpc(fn, args) {
    return fetch(RPC + fn, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, authHeaders),
      body: JSON.stringify(args)
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  function renderPosts(posts) {
    if (!posts.length) {
      list.innerHTML = '<li class="gb-empty">아직 글이 없어요. 첫 글을 남겨보세요!</li>';
      return;
    }
    list.innerHTML = posts.map(function (p) {
      var title = p.title || p.name || "(제목 없음)";
      return '<li class="gb-item" data-id="' + p.id + '">' +
        '<button type="button" class="gb-item-head" aria-expanded="false">' +
          '<span class="gb-item-title">' + esc(title) + '</span>' +
          '<span class="gb-item-meta">' +
            '<span class="gb-item-by">' + esc(p.name || "익명") + '</span>' +
            '<span class="gb-item-time">' + esc(timeago(p.created_at)) + '</span>' +
            '<span class="gb-chevron" aria-hidden="true">▾</span>' +
          '</span>' +
        '</button>' +
        '<div class="gb-item-body"><div class="gb-item-body-inner">' +
          '<p class="gb-item-msg">' + esc(p.message) + '</p>' +
          '<div class="gb-item-foot">' +
            '<span class="gb-item-actions">' +
              '<button type="button" class="gb-act" data-act="edit">수정</button>' +
              '<button type="button" class="gb-act gb-act-del" data-act="delete">삭제</button>' +
            '</span>' +
          '</div>' +
        '</div></div>' +
      '</li>';
    }).join("");
  }

  function itemOf(el) { return el.closest(".gb-item"); }
  function reopen(id) {
    var it = list.querySelector('.gb-item[data-id="' + id + '"]');
    if (it) { it.classList.add("is-open"); it.querySelector(".gb-item-head").setAttribute("aria-expanded", "true"); }
  }
  function inlineMsg(item, msg) {
    var e = item.querySelector(".gb-inline-msg");
    if (e) e.textContent = msg || "";
  }

  // 삭제: 인라인 비밀번호 확인 UI
  function showDeleteConfirm(item) {
    var box = item.querySelector(".gb-item-actions");
    var id = item.getAttribute("data-id");
    var locked = lockRemain(id) > 0;
    box.innerHTML =
      '<span class="gb-confirm-q">정말 삭제할까요? 되돌릴 수 없습니다.</span>' +
      '<input type="password" class="gb-inline-pw" placeholder="비밀번호" maxlength="40"' + (locked ? ' disabled' : '') + '/>' +
      '<button type="button" class="gb-act gb-act-del" data-act="delete-confirm"' + (locked ? ' disabled' : '') + '>삭제</button>' +
      '<button type="button" class="gb-act" data-act="cancel">취소</button>' +
      '<span class="gb-inline-msg">' + esc(lockMsg(id)) + '</span>';
    var pw = box.querySelector(".gb-inline-pw");
    if (pw && !locked) pw.focus();
  }
  function doDelete(item) {
    var id = parseInt(item.getAttribute("data-id"), 10);
    if (lockRemain(id)) { inlineMsg(item, lockMsg(id)); return; }
    var pwInput = item.querySelector(".gb-inline-pw");
    var pw = pwInput ? pwInput.value : "";
    if (!pw) { if (pwInput) pwInput.focus(); return; }
    var btn = item.querySelector('[data-act="delete-confirm"]');
    if (btn) btn.disabled = true;
    rpc("delete_post", { p_id: id, p_password: pw })
      .then(function (ok) {
        if (ok === true) { clearFail(id); load(page); }
        else {
          recordFail(id);
          if (lockRemain(id)) { showDeleteConfirm(item); } // 잠금 → 입력·버튼 비활성 재렌더
          else { inlineMsg(item, "비밀번호가 일치하지 않습니다."); if (btn) btn.disabled = false; }
        }
      })
      .catch(function () { inlineMsg(item, "삭제에 실패했습니다."); if (btn) btn.disabled = false; });
  }

  // 수정: 인라인 편집 폼
  function showEditForm(item) {
    var inner = item.querySelector(".gb-item-body-inner");
    var curTitle = item.querySelector(".gb-item-title").textContent;
    var curMsg = item.querySelector(".gb-item-msg").textContent;
    inner.innerHTML =
      '<div class="gb-edit">' +
        '<input type="text" class="gb-title gb-edit-title" maxlength="60" placeholder="제목"/>' +
        '<textarea class="gb-message gb-edit-msg" rows="3" maxlength="500" placeholder="내용"></textarea>' +
        '<div class="gb-edit-foot">' +
          '<input type="password" class="gb-inline-pw gb-edit-pw" placeholder="비밀번호 (본인 확인)" maxlength="40"/>' +
          '<div class="gb-edit-btns">' +
            '<button type="button" class="gb-act" data-act="cancel">취소</button>' +
            '<button type="button" class="gb-act gb-edit-save" data-act="edit-save">저장</button>' +
          '</div>' +
        '</div>' +
        '<span class="gb-inline-msg"></span>' +
      '</div>';
    inner.querySelector(".gb-edit-title").value = curTitle;
    inner.querySelector(".gb-edit-msg").value = curMsg;
    inner.querySelector(".gb-edit-title").focus();
  }
  function doUpdate(item) {
    var id = parseInt(item.getAttribute("data-id"), 10);
    if (lockRemain(id)) { inlineMsg(item, lockMsg(id)); return; }
    var t = item.querySelector(".gb-edit-title").value.trim();
    var m = item.querySelector(".gb-edit-msg").value.trim();
    var pw = item.querySelector(".gb-edit-pw").value;
    if (!t || !m) { inlineMsg(item, "제목과 내용을 입력해 주세요."); return; }
    if (!pw) { item.querySelector(".gb-edit-pw").focus(); return; }
    var btn = item.querySelector(".gb-edit-save");
    if (btn) btn.disabled = true;
    rpc("update_post", { p_id: id, p_password: pw, p_title: t.slice(0, 60), p_message: m.slice(0, 500) })
      .then(function (ok) {
        if (ok === true) { clearFail(id); load(page); }
        else {
          recordFail(id);
          var locked = lockRemain(id) > 0;
          inlineMsg(item, locked ? lockMsg(id) : "비밀번호가 일치하지 않습니다.");
          if (btn) btn.disabled = locked; // 잠기면 저장 버튼 비활성 유지
        }
      })
      .catch(function () { inlineMsg(item, "수정에 실패했습니다."); if (btn) btn.disabled = false; });
  }

  // 목록 클릭: 아코디언 토글 + 수정/삭제 액션 (이벤트 위임)
  list.addEventListener("click", function (e) {
    var act = e.target.closest("[data-act]");
    if (act && list.contains(act)) {
      var item = itemOf(act), a = act.getAttribute("data-act");
      if (a === "edit") showEditForm(item);
      else if (a === "edit-save") doUpdate(item);
      else if (a === "delete") showDeleteConfirm(item);
      else if (a === "delete-confirm") doDelete(item);
      else if (a === "cancel") { renderPosts(currentPosts); reopen(item.getAttribute("data-id")); }
      return;
    }
    var head = e.target.closest(".gb-item-head");
    if (!head || !list.contains(head)) return;
    var it = head.parentElement;
    var willOpen = head.getAttribute("aria-expanded") !== "true";
    var openHeads = list.querySelectorAll('.gb-item-head[aria-expanded="true"]');
    for (var i = 0; i < openHeads.length; i++) {
      openHeads[i].setAttribute("aria-expanded", "false");
      openHeads[i].parentElement.classList.remove("is-open");
    }
    if (willOpen) { head.setAttribute("aria-expanded", "true"); it.classList.add("is-open"); }
  });

  function pageList(cur, total) {
    if (total <= 7) { var all = []; for (var i = 1; i <= total; i++) all.push(i); return all; }
    var res = [1], start = Math.max(2, cur - 1), end = Math.min(total - 1, cur + 1);
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
      html += '<button type="button" data-go="' + n + '"' + (n === page ? ' aria-current="page"' : "") + '>' + n + '</button>';
    });
    html += '<button type="button" class="gb-page-nav" data-go="' + (page + 1) + '"' +
      (page >= totalPages ? " disabled" : "") + ' aria-label="다음 페이지">›</button>';
    pager.innerHTML = html;
  }

  function fetchPage(p) {
    var offset = (p - 1) * PAGE_SIZE;
    var url = REST + "?select=id,created_at,name,title,message&order=created_at.desc" +
      "&limit=" + PAGE_SIZE + "&offset=" + offset;
    return fetch(url, { headers: Object.assign({ Prefer: "count=exact" }, authHeaders) })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        var cr = r.headers.get("content-range");
        if (cr) { var tot = cr.split("/")[1]; totalCount = (!tot || tot === "*") ? 0 : (parseInt(tot, 10) || 0); }
        return r.json();
      });
  }

  function load(p, scroll) {
    // 삭제로 현재 페이지가 비면 이전 페이지로
    if (p < 1) p = 1;
    page = p;
    list.setAttribute("aria-busy", "true");
    fetchPage(p)
      .then(function (posts) {
        if (!posts.length && p > 1) { load(p - 1, scroll); return; }
        currentPosts = posts;
        renderPosts(posts);
        renderPager();
        if (totalEl) totalEl.textContent = totalCount ? "총 " + totalCount + "개의 글" : "";
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
    var title = titleEl.value.trim();
    if (!title) { setStatus("제목을 입력해 주세요.", "err"); titleEl.focus(); return; }
    var message = msgEl.value.trim();
    if (!message) { setStatus("내용을 입력해 주세요.", "err"); msgEl.focus(); return; }
    var pw = pwEl.value;
    if (pw.length < 4) { setStatus("비밀번호는 4자 이상 입력해 주세요.", "err"); pwEl.focus(); return; }
    var name = nameEl.value.trim().slice(0, 20) || "익명";
    submitEl.disabled = true;
    setStatus("등록 중…");
    rpc("create_post", { p_name: name, p_title: title.slice(0, 60), p_message: message.slice(0, 500), p_password: pw })
      .then(function () {
        titleEl.value = ""; msgEl.value = ""; pwEl.value = "";
        countEl.textContent = "0 / 500";
        setStatus("");
        closeModal();
        flash("등록되었습니다 ✓");
        load(1);
      })
      .catch(function () { setStatus("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.", "err"); })
      .finally(function () { submitEl.disabled = false; });
  });

  msgEl.addEventListener("input", function () {
    countEl.textContent = msgEl.value.length + " / 500";
  });

  load(1);
})();
