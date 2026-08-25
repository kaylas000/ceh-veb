/* PRJ-02 · Дез Обработка — поведение собрано из рецептов motion/:
   intro-assembly (заставка SK-06), mask-reveal (700ms · ceh-brake),
   counter-tick (1200ms · ceh-drag, стаггер 120ms), sticky-сцена протокола.
   Easing — только из motion/easing-curves.json. */
(function () {
  "use strict";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ceh-drag = cubic-bezier(0.65, 0, 0.15, 1) — решатель Ньютона для JS-кадров */
  function makeBezier(ax, ay, bx, by) {
    function cx(t) { return 3 * ax * t * (1 - t) * (1 - t) + 3 * bx * t * t * (1 - t) + t * t * t; }
    function cy(t) { return 3 * ay * t * (1 - t) * (1 - t) + 3 * by * t * t * (1 - t) + t * t * t; }
    return function (x) {
      var u = x, i, d;
      for (i = 0; i < 6; i++) {
        var err = cx(u) - x;
        if (Math.abs(err) < 1e-4) break;
        d = (cx(u + 1e-4) - cx(u - 1e-4)) / 2e-4;
        if (d) u -= err / d;
      }
      return cy(Math.min(1, Math.max(0, u)));
    };
  }
  var cehDrag = makeBezier(0.65, 0, 0.15, 1);

  /* counter-tick: пересчёт 0 → цель за 1200ms */
  function tick(el, to, delay) {
    if (RM) { el.textContent = fmt(to); return; }
    window.setTimeout(function () {
      requestAnimationFrame(function step(ts) {
        if (!step.t0) step.t0 = ts;
        var p = Math.min(1, (ts - step.t0) / 1200);
        el.textContent = fmt(Math.round(to * cehDrag(p)));
        if (p < 1) requestAnimationFrame(step);
      });
    }, delay || 0);
  }

  /* Запуск сценариев страницы — после шторок заставки (или сразу, если её нет) */
  function startMotion() {
    /* mask-reveal: строка из-под кромки, IO 0.3 (по snippet.js рецепта) */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-live"); io.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (RM) { el.classList.add("is-live"); } else { io.observe(el); }
    });

    /* счётчики с источником цифры: стаггер 120ms */
    var tickerIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target, idx = Number(el.dataset.i || 0);
          tick(el, Number(el.dataset.to || 0), idx * 120);
          tickerIO.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-tick]").forEach(function (el, i) {
      el.dataset.i = i;
      tickerIO.observe(el);
    });
  }

  /* ---- кинозаставка (SK-06): ≤3.4s сцена + шторки 3.3–4.2s, один показ за сессию ---- */
  var INTRO_KEY = "dez-intro-seen";
  var intro = document.getElementById("intro");
  var seen = false;
  try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; } catch (e) { seen = false; }

  var introTimers = [];
  function dropIntro() {
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch (e) { /* приватный режим */ }
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    document.removeEventListener("keydown", onEsc);
    introTimers.forEach(clearTimeout);
  }
  function finishIntro() {
    if (intro) intro.classList.add("is-done");
    introTimers.push(window.setTimeout(function () { dropIntro(); startMotion(); }, 950));
  }
  function onEsc(ev) { if (ev.key === "Escape") skipIntro(); }
  function skipIntro() {
    if (!intro) return;
    introTimers.forEach(clearTimeout);
    finishIntro();
  }

  if (intro && !RM && !seen) {
    document.addEventListener("keydown", onEsc);
    var skipBtn = intro.querySelector("[data-intro-skip]");
    if (skipBtn) skipBtn.addEventListener("click", skipIntro);
    introTimers.push(window.setTimeout(finishIntro, 3250));
  } else {
    dropIntro();
    if (RM) { startMotion(); } else { startMotion(); }
  }

  /* явный реплей из футера (SK-06, правило 2) */
  document.querySelectorAll("[data-replay-intro]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      try { sessionStorage.removeItem(INTRO_KEY); } catch (e) { /* ок */ }
      window.location.reload();
    });
  });

  /* ---- прайс: ступени — вредитель, помещение, итог с пересчётом ---- */
  var NAMES = ["Тараканы", "Клопы", "Муравьи", "Блохи", "Клещи", "Мухи", "Грызуны", "Комары", "Осы"];
  var ROOMS = ["1 комната", "1-к квартира", "2-к квартира", "3-к квартира", "Дом ≤100 м²", "Дом 100–200 м²", "Дом >200 м²"];
  var PRICES = [
    [1200, 1500, 1800, 2200, 2500, 3000, 3500],
    [1400, 1700, 2000, 2400, 2800, 3300, 3800],
    [1100, 1400, 1700, 2000, 2300, 2700, 3200],
    [1300, 1600, 1900, 2300, 2600, 3100, 3600],
    [1000, 1300, 1600, 1900, 2200, 2600, 3000],
    [1200, 1500, 1800, 2200, 2500, 3000, 3500],
    [800, 1000, 1200, 1500, 1800, 2200, 2700],
    [1200, 1500, 1800, 2200, 2500, 3000, 3500],
    [400, 500, 700, 900, 1200, 1500, 2000]
  ];
  var state = { svc: 0, room: 1 };
  var svcEl = document.getElementById("calcSvc");
  var roomEl = document.getElementById("calcRoom");
  var numEl = document.getElementById("calcNum");
  var rows = document.querySelectorAll("#ledger [data-row]");

  function makeChips(host, labels, key) {
    labels.forEach(function (label, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state[key] = i;
        render(true);
      });
      host.appendChild(b);
    });
  }

  function render(withTick) {
    Array.prototype.forEach.call(svcEl.children, function (c, i) {
      c.setAttribute("aria-pressed", String(i === state.svc));
    });
    Array.prototype.forEach.call(roomEl.children, function (c, i) {
      c.setAttribute("aria-pressed", String(i === state.room));
    });
    rows.forEach(function (tr, i) {
      tr.classList.toggle("sel", i === state.svc);
      Array.prototype.forEach.call(tr.children, function (cell, j) {
        cell.classList.toggle("sel-cell", i === state.svc && cell.tagName === "TD" && j - 1 === state.room);
      });
    });
    var to = PRICES[state.svc][state.room];
    if (withTick) { tick(numEl, to, 0); } else { numEl.textContent = fmt(to); }
  }

  if (svcEl && roomEl && numEl) {
    makeChips(svcEl, NAMES, "svc");
    makeChips(roomEl, ROOMS, "room");
    render(false);
    /* строка реестра подставляет услугу в расчёт */
    document.querySelectorAll("[data-pick]").forEach(function (a) {
      a.addEventListener("click", function () {
        state.svc = Number(a.dataset.pick || 0);
        render(true);
      });
    });
    /* клик по строке ведомости тоже синхронизирует калькулятор */
    rows.forEach(function (tr, i) {
      tr.addEventListener("click", function () {
        state.svc = i;
        render(true);
      });
    });
  }

  /* ---- sticky-сцена протокола: шаг текста меняет ровно одно состояние плиты ---- */
  var pinNum = document.getElementById("pinNum");
  var pinLabel = document.getElementById("pinLabel");
  var pinParam = document.getElementById("pinParam");
  var pinFill = document.getElementById("pinFill");
  var steps = document.querySelectorAll("[data-step]");
  var STATES = {
    1: ["01", "ОСМОТР ОБЪЕКТА", "бесплатно · финальная цена до начала работ"],
    2: ["02", "ПОДГОТОВКА", "мебель от стен 15–20 см · продукты в шкафы"],
    3: ["03", "ХОЛОДНЫЙ ТУМАН", "40–60 минут · частица 10–50 мкм · 4 класс"],
    4: ["04", "КОНТРОЛЬНЫЙ ВИЗИТ", "21-й день · бесплатно · гарантия до 12 месяцев"]
  };
  function apply(s) {
    if (!STATES[s]) return;
    pinNum.textContent = STATES[s][0];
    pinLabel.textContent = STATES[s][1];
    pinParam.textContent = STATES[s][2];
    pinFill.style.width = s * 25 + "%";
    steps.forEach(function (st) { st.classList.toggle("on", Number(st.dataset.step) === s); });
  }
  if (pinNum && steps.length) {
    apply(1);
    var sceneIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) apply(Number(e.target.dataset.step));
      });
    }, { threshold: 0.55 });
    steps.forEach(function (s) { sceneIO.observe(s); });
  }
})();
