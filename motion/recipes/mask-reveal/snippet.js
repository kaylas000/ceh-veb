/* mask-reveal · IntersectionObserver + CSS · без библиотек */
(function () {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("mask-live"); io.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll("[data-mask]").forEach(function (el) { io.observe(el); });
})();
