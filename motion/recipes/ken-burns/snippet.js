/* ken-burns · каркас сниппета · допиши под рецепт в recipe.yaml */
(function () {
  /* 1. выбери элементы; 2. слушай скролл/вход во вьюпорт; 3. меняй одно состояние */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("is-live"); });
  }, { threshold: 0.3 });
  document.querySelectorAll("[data-ken-burns]").forEach(function (el) { io.observe(el); });
})();
