/* sticky-scene · IntersectionObserver · без библиотек */
(function () {
  var pin = document.querySelector("[data-pin]");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (pin && e.isIntersecting) pin.dataset.active = e.target.dataset.step;
    });
  }, { threshold: 0.55 });
  document.querySelectorAll("[data-step]").forEach(function (s) { io.observe(s); });
})();
