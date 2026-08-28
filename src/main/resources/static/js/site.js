// 축제 홈 인터랙션 — 스크롤 스파이 · 리빌 · 일정표 탭 · 계좌복사 · 낯선가계도 데모
(function () {
  // 진입 애니메이션 스위치. 이게 붙어야 CSS가 초기 상태를 숨긴다.
  // 관찰자를 걸 수 없는 환경에서는 붙이지 않아 내용이 그대로 보인다.
  var canObserve = 'IntersectionObserver' in window;
  if (canObserve) document.documentElement.classList.add('js-anim');

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

  // PC 하위 메뉴는 호버로 열린다. 그런데 트리거를 마우스로 누르면 버튼에 포커스가
  // 남고, 그 포커스를 :focus-within 이 붙잡아 마우스를 치워도 메뉴가 열려 있다.
  // 포인터로 누른 경우(detail > 0)에만 포커스를 거둔다. 키보드로 누르면(Enter·Space)
  // detail 이 0이라 그대로 두어, 탭으로 하위 항목까지 들어갈 수 있다.
  document.querySelectorAll('.nav-group-trigger').forEach(function (btn) {
    btn.addEventListener('click', function (e) { if (e.detail > 0) btn.blur(); });
  });

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

  // 안전망 — 숨은 탭에서는 IntersectionObserver 콜백이 오지 않아 화면이 빈 채로
  // 남는다. load 시점과 탭이 다시 보이는 시점에 화면 안의 것들을 직접 확인한다.
  if (canObserve) {
    var settle = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) el.classList.add('in');
      });
      document.querySelectorAll('.sec-head').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.82 && r.bottom > 0) el.classList.add('sh-in');
      });
    };
    if (document.readyState === 'complete') settle();
    else window.addEventListener('load', settle);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) settle();
    });
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

  // 모달 포커스 트랩 — 열려 있는 동안 Tab이 배경으로 새지 않게 가둔다.
  // 세 모달(.map-modal)이 같은 구조라 한 곳에서 처리한다.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var open = document.querySelector('.map-modal.open');
    if (!open) return;
    var dialog = open.querySelector('.map-dialog');
    if (!dialog) return;
    var items = Array.prototype.slice.call(dialog.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // 일정표 요일 탭 (role=tab 패턴: 클릭 + 좌우 화살표)
  var schedTabs = Array.prototype.slice.call(document.querySelectorAll('.sched-tab'));
  var selectDay = function (tab) {
    var day = tab.getAttribute('data-day');
    schedTabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.sched-zones').forEach(function (panel) {
      panel.style.display = (panel.getAttribute('data-day-panel') === day) ? 'flex' : 'none';
    });
  };
  schedTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectDay(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = schedTabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + schedTabs.length) % schedTabs.length];
      next.focus(); selectDay(next);
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
  // ---------- D-day ----------
  // 축제 시작일까지 남은 날. 보는 사람의 시계가 어느 지역이든 같은 숫자가 나오도록
  // 한국 시간(UTC+9 고정, 서머타임 없음) 기준의 '오늘'로 계산한다.
  // 탭을 오래 열어둬도 자정에 스스로 갱신한다.
  (function () {
    var el = document.getElementById('dday');
    if (!el) return;
    var label = el.querySelector('.dd-label');
    var value = el.querySelector('.dd-value');
    if (!label || !value) return;

    var KST_OFFSET_MS = 9 * 3600000;
    var DAY_MS = 86400000;

    // 날짜를 '1970-01-01로부터 며칠째'인 정수로 바꾼다. 시각·시간대가 섞이지 않아
    // 뺄셈만으로 안전하게 날짜 차이를 얻는다.
    var dayOf = function (text) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
      if (!m) return null;
      return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS;
    };
    // epoch 밀리초에 +9시간을 더하고 UTC 필드로 읽으면 한국의 벽시계가 된다.
    // 보는 사람의 시간대와 무관하게 같은 값이 나온다.
    var kstNowMs = function () { return Date.now() + KST_OFFSET_MS; };
    var kstToday = function () {
      var k = new Date(kstNowMs());
      return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) / DAY_MS;
    };

    var start = dayOf(el.dataset.start);
    var end = dayOf(el.dataset.end);
    if (start === null) return;
    if (end === null || end < start) end = start;

    var render = function () {
      var today = kstToday();
      var left = start - today;
      if (left > 0) {
        label.textContent = '축제까지';
        label.hidden = false;
        value.textContent = 'D-' + left;
      } else if (today <= end) {
        label.hidden = true;
        value.textContent = today === start ? 'D-DAY' : '축제 ' + (today - start + 1) + '일차';
      } else {
        el.hidden = true;   // 끝난 뒤에는 숫자를 남기지 않는다
        return;
      }
      el.hidden = false;
    };

    render();

    // 다음 한국 시간 자정에 한 번, 그 뒤로는 하루 간격으로 다시 그린다.
    var msToKstMidnight = function () {
      var ms = kstNowMs();
      return DAY_MS - (((ms % DAY_MS) + DAY_MS) % DAY_MS);
    };
    setTimeout(function tick() {
      render();
      setTimeout(tick, DAY_MS);
    }, msToKstMidnight() + 1000);

    // 절전 상태로 며칠이 지난 기기에서 돌아왔을 때를 대비해, 탭이 보일 때도 확인한다.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });
  })();
  // ---------- 히어로 제목: 글자 레이어 + 불꽃 레이어 ----------
  // SVG 안에서 맨 앞 <g> 하나가 글자이고, 나머지 조각이 전부 불꽃이다.
  // 둘을 갈라 겹쳐 놓고, 불꽃만 스크롤에 맞춰 퍼뜨린다.
  (function () {
    var root = document.getElementById('mainTitle');
    if (!root || !root.dataset.svg || !window.fetch || !window.DOMParser) return;

    fetch(root.dataset.svg).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (markup) {
      var doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
      var svg = doc.querySelector('svg');
      if (!svg || doc.querySelector('parsererror')) return;
      var titleGroup = svg.querySelector(':scope > g');
      if (!titleGroup) return;

      // 글자 레이어 — defs와 첫 g만 남긴다
      var titleSvg = svg.cloneNode(true);
      Array.prototype.slice.call(titleSvg.children).forEach(function (el) {
        var t = el.tagName.toLowerCase();
        if (t !== 'defs' && t !== 'g') el.remove();
      });
      titleSvg.setAttribute('aria-hidden', 'true');
      titleSvg.setAttribute('focusable', 'false');

      // 불꽃 레이어 — 첫 g만 빼고 나머지에 표식을 단다
      var fxSvg = svg.cloneNode(true);
      var firstG = fxSvg.querySelector(':scope > g');
      if (firstG) firstG.remove();
      Array.prototype.slice.call(fxSvg.children).forEach(function (el) {
        if (el.tagName.toLowerCase() !== 'defs') el.classList.add('firework-particle');
      });
      fxSvg.setAttribute('aria-hidden', 'true');
      fxSvg.setAttribute('focusable', 'false');

      var stage = document.createElement('span');
      stage.className = 'main-title-layers';
      var fxWrap = document.createElement('span');
      fxWrap.className = 'fireworks-layer';
      fxWrap.appendChild(fxSvg);
      var titleWrap = document.createElement('span');
      titleWrap.className = 'static-title-layer';
      titleWrap.appendChild(titleSvg);
      stage.appendChild(fxWrap);
      stage.appendChild(titleWrap);

      root.textContent = '';
      root.appendChild(stage);
      root.classList.add('is-loaded');

      var sparks = Array.prototype.slice.call(root.querySelectorAll('.firework-particle'));
      if (!sparks.length) return;

      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var frame = 0;

      var update = function () {
        frame = 0;
        // 불꽃이 다 피는 데 걸리는 스크롤 거리. 짧을수록 일찍 터진다.
        var distance = Math.max(110, Math.min(240, window.innerHeight * 0.28));
        var progress = mq.matches ? 1 : Math.max(0, Math.min(1, window.scrollY / distance));
        sparks.forEach(function (spark, i) {
          var delay = (i % 11) * 0.012;
          var local = Math.max(0, Math.min(1, (progress - delay) / 0.8));
          var eased = 1 - Math.pow(1 - local, 3);
          var dir = i % 2 === 0 ? 1 : -1;
          spark.style.opacity = String(eased);
          spark.style.transform = 'translateY(' + ((1 - eased) * (12 + (i % 4) * 5)) + 'px)' +
            ' scale(' + (0.16 + eased * 0.84) + ')' +
            ' rotate(' + (dir * (1 - eased) * (9 + (i % 5) * 4)) + 'deg)';
        });
      };
      var schedule = function () { if (!frame) frame = requestAnimationFrame(update); };

      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      if (mq.addEventListener) mq.addEventListener('change', schedule);
    }).catch(function () { /* 못 받아오면 글자 대체본이 그대로 남는다 */ });
  })();

  // ---------- 히어로 하단: 걸어오는 사람들 ----------
  // 두 SVG가 모두 .st0~ 클래스를 쓰고 색이 달라, 한쪽 이름을 바꿔야 서로 덮어쓰지 않는다.
  (function () {
    var fig = document.getElementById('ovWalkers');
    if (!fig || !fig.dataset.svg || !window.fetch) return;
    var stage = fig.querySelector('.walkers-stage');
    if (!stage) return;

    fetch(fig.dataset.svg).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (markup) {
      stage.innerHTML = markup
        .replace(/\bst(\d+)\b/g, 'walk-st$1')
        .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');
      fig.classList.add('is-loaded');

      var people = stage.querySelector('[data-name="레이어_1"]');
      var effects = stage.querySelector('[data-name="레이어_2"]');
      var text = stage.querySelector('[data-name="레이어_3"]');
      if (!people || !effects || !text) return;

      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var frame = 0;

      var update = function () {
        frame = 0;
        var rect = fig.getBoundingClientRect();
        var raw = (window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.45);
        var p = mq.matches ? 1 : Math.max(0, Math.min(1, raw));
        var fx = Math.max(0, Math.min(1, (p - 0.2) / 0.58));
        var tp = Math.max(0, Math.min(1, (p - 0.08) / 0.58));
        people.style.transform = 'translateY(' + ((1 - p) * 24) + 'px) scale(' + (0.82 + p * 0.22) + ')';
        effects.style.opacity = String(fx);
        effects.style.transform = 'translateY(' + ((1 - fx) * 12) + 'px)';
        text.style.opacity = String(tp);
        text.style.transform = 'scale(' + (0.12 + (1 - Math.pow(1 - tp, 3)) * 0.88) + ')';
      };
      var schedule = function () { if (!frame) frame = requestAnimationFrame(update); };

      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      if (mq.addEventListener) mq.addEventListener('change', schedule);
    }).catch(function () { /* 못 받아오면 대체 문구가 그대로 남는다 */ });
  })();
})();
