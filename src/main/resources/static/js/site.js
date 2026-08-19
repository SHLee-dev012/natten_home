// 축제 홈 인터랙션 — 스크롤 스파이 · 리빌 · 일정표 탭 · 계좌복사 · 낯선가계도 데모
(function () {
  // 공지 티커 — 클릭 시 상세 펼침
  var ticker = document.getElementById('notice');
  var ntToggle = document.getElementById('ntToggle');
  if (ticker && ntToggle) {
    var collapseNotice = function () {
      ticker.classList.remove('open');
      ntToggle.setAttribute('aria-expanded', 'false');
    };
    ntToggle.addEventListener('click', function () {
      var open = ticker.classList.toggle('open');
      ntToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // 스크롤을 내리면 펼쳐진 공지 자동 접힘
    window.addEventListener('scroll', function () {
      if (ticker.classList.contains('open') && window.scrollY > 40) collapseNotice();
    }, { passive: true });
  }

  // 모바일 플로팅 스크롤 버튼 (맨 위로 / 맨 아래로)
  var fab = document.getElementById('scrollFab');
  if (fab) {
    var sfTop = document.getElementById('sfTop');
    var sfBottom = document.getElementById('sfBottom');
    sfTop.addEventListener('click', function () { window.scrollTo(0, 0); });
    sfBottom.addEventListener('click', function () { window.scrollTo(0, document.documentElement.scrollHeight); });
    var updateFab = function () {
      var y = window.scrollY, vh = window.innerHeight, dh = document.documentElement.scrollHeight;
      sfTop.classList.toggle('sf-hide', y < 240);
      sfBottom.classList.toggle('sf-hide', y + vh >= dh - 240);
    };
    updateFab();
    window.addEventListener('scroll', updateFab, { passive: true });
    window.addEventListener('resize', updateFab, { passive: true });
  }

  // 헤더 스크롤 상태(고정 시 블러·그림자 강화)
  var siteNav = document.querySelector('header.site-nav');
  if (siteNav) {
    var onNavScroll = function () { siteNav.classList.toggle('scrolled', window.scrollY > 10); };
    onNavScroll();
    window.addEventListener('scroll', onNavScroll, { passive: true });
  }

  // 모바일 햄버거 메뉴
  var navToggle = document.getElementById('nav-toggle');
  var navLinksEl = document.getElementById('nav-links');
  if (navToggle && navLinksEl) {
    var setOpen = function (open) {
      navLinksEl.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      navToggle.textContent = open ? '✕' : '☰';
    };
    navToggle.addEventListener('click', function () { setOpen(!navLinksEl.classList.contains('open')); });
    navLinksEl.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  // 내비게이션 스크롤 스파이
  var navLinks = document.querySelectorAll('.nav-links a[data-nav]');
  var targets = Array.prototype.map.call(navLinks, function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = '#' + entry.target.id;
          navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === id); });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  }

  // 섹션 타이틀 진입 애니메이션 (섹션으로 이동할 때마다 재생)
  var secHeads = document.querySelectorAll('.sec-head');
  if (secHeads.length && 'IntersectionObserver' in window) {
    var sho = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('sh-in', entry.isIntersecting);
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.25 });
    secHeads.forEach(function (el) { sho.observe(el); });
  } else {
    secHeads.forEach(function (el) { el.classList.add('sh-in'); });
  }

  // 스크롤 리빌
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); rio.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // 일정표 모달 (메뉴의 일정표 버튼으로 연다)
  var schedModal = document.getElementById('schedModal');
  var schedBtn = document.getElementById('schedBtn');
  if (schedModal && schedBtn) {
    var lastSchedFocus = null;
    var openSched = function () {
      lastSchedFocus = document.activeElement;
      schedModal.classList.add('open');
      schedModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var close = schedModal.querySelector('.map-close');
      if (close) setTimeout(function () { close.focus(); }, 60);
    };
    var closeSched = function () {
      schedModal.classList.remove('open');
      schedModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastSchedFocus && lastSchedFocus.focus) lastSchedFocus.focus();
    };
    schedBtn.addEventListener('click', function () {
      // 모바일 드로어가 열려 있으면 먼저 닫는다
      if (navLinksEl && navLinksEl.classList.contains('open')) navToggle.click();
      openSched();
    });
    schedModal.querySelectorAll('[data-schedclose]').forEach(function (el) { el.addEventListener('click', closeSched); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && schedModal.classList.contains('open')) closeSched();
    });
  }

  // 캠퍼스 맵 모달 — 상단 캠퍼스맵 버튼으로 연다 (일정표와 같은 패턴)
  var mapModal = document.getElementById('mapModal');
  var mapBtn = document.getElementById('mapBtn');
  if (mapModal && mapBtn) {
    var lastMapFocus = null;
    var openMap = function () {
      lastMapFocus = document.activeElement;
      mapModal.classList.add('open');
      mapModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var close = mapModal.querySelector('.map-close');
      if (close) setTimeout(function () { close.focus(); }, 60);
    };
    var closeMap = function () {
      mapModal.classList.remove('open');
      mapModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastMapFocus && lastMapFocus.focus) lastMapFocus.focus();
    };
    mapBtn.addEventListener('click', function () {
      // 모바일 드로어가 열려 있으면 먼저 닫는다
      if (navLinksEl && navLinksEl.classList.contains('open')) navToggle.click();
      openMap();
    });
    mapModal.querySelectorAll('[data-mapclose]').forEach(function (el) { el.addEventListener('click', closeMap); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mapModal.classList.contains('open')) closeMap();
    });
  }

  // 일정표 요일 탭
  var schedTabs = document.querySelectorAll('.sched-tab');
  schedTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var day = tab.getAttribute('data-day');
      schedTabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('.sched-zones').forEach(function (panel) {
        panel.style.display = (panel.getAttribute('data-day-panel') === day) ? 'flex' : 'none';
      });
    });
  });

  // 계좌번호 복사
  var copyBtn = document.getElementById('copyAcctBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = '101-910061-06104';
      var reset = function () { setTimeout(function () { copyBtn.textContent = '계좌번호 복사'; }, 1800); };
      var done = function () { copyBtn.textContent = '복사 완료 ✓'; reset(); };
      var fail = function () { copyBtn.textContent = '복사 실패'; reset(); };
      // 폴백: clipboard API 실패 시 execCommand로 복사
      var legacy = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
          document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
          var ok = document.execCommand('copy'); document.body.removeChild(ta);
          ok ? done() : fail();
        } catch (e) { fail(); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(legacy);
      } else { legacy(); }
    });
  }

  // 낯선가계도 데모
  var ftBtn = document.getElementById('ftFindBtn');
  if (ftBtn) {
    var ftAncestors = [
      { name: '백영선(록담)', line: '낯선대학 창립자 · 1기의 뿌리' },
      { name: '김상미', line: '초창기 강연 프로그램을 설계한 2기 선배' },
      { name: '이선용', line: '낯3·4를 이어온 커리어 전환의 계보' },
      { name: '온은주', line: '비주얼 씽킹으로 여러 기수를 연결한 선배' },
      { name: '심원희', line: 'Y세대 커뮤니티 리더십의 계보' },
      { name: '반기훈', line: '네트워킹과 취향 공유의 계보' }
    ];
    ftBtn.addEventListener('click', function () {
      var nameInput = document.getElementById('ftName');
      var gen = document.getElementById('ftGen');
      var result = document.getElementById('ftResult');
      var name = (nameInput.value || '').trim();
      if (!name) {
        result.innerHTML = '<p class="ft-warn">이름을 먼저 입력해주세요.</p>';
        result.style.display = 'block';
        return;
      }
      var seed = 0;
      for (var i = 0; i < name.length; i++) { seed += name.charCodeAt(i); }
      var pick = ftAncestors[seed % ftAncestors.length];
      var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
      result.innerHTML =
        '<span class="ft-demo-tag">DEMO · 예시 결과</span>' +
        '<p class="ft-line"><b>' + esc(gen.value + ' ' + name) + '</b>님의 낯선 조상은 —</p>' +
        '<p class="ft-ancestor">' + esc(pick.name) + '</p>' +
        '<p class="ft-desc">' + esc(pick.line) + '</p>' +
        '<p class="ft-footnote">※ 실제 가계도 데이터는 준비 중이며, 연결되는 대로 정확한 결과로 교체됩니다.</p>';
      result.style.display = 'block';
    });
  }
})();
