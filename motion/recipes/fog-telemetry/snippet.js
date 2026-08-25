/* fog-telemetry · IntersectionObserver · добыто из dezobrabotka, без библиотек */
(function () {
  var STATES = {
    /* шаг: [номер, статус, параметр] — заполни под свой регламент */
    1: ["01", "ЗАЯВКА ПРИНЯТА", "диспетчер на связи"],
    2: ["02", "ВЫЕЗД", "специалист в пути"],
    3: ["03", "ОБРАБОТКА", "частица 10–50 мкм"],
    4: ["04", "КОНТРОЛЬ", "повторный визит бесплатно"]
  };
  var num = document.querySelector("[data-fog-num]");
  var label = document.querySelector("[data-fog-label]");
  var param = document.querySelector("[data-fog-param]");
  var fill = document.querySelector("[data-fog-fill]");
  var steps = document.querySelectorAll("[data-fog-step]");
  function apply(s) {
    if (!STATES[s]) return;
    if (num) num.textContent = STATES[s][0];
    if (label) label.textContent = STATES[s][1];
    if (param) param.textContent = STATES[s][2];
    if (fill) fill.style.width = s * 25 + "%";
    steps.forEach(function (st) {
      st.classList.toggle("on", Number(st.getAttribute("data-fog-step")) === s);
    });
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) apply(Number(e.target.getAttribute("data-fog-step")));
    });
  }, { threshold: 0.55 });
  steps.forEach(function (s) { io.observe(s); });
  apply(1);
})();
