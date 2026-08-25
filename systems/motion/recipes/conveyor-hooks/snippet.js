/* conveyor-hooks · CSS-анимация ленты + фазовое качание крюков */
(function () {
  var hooks = document.querySelectorAll("[data-hook]");
  hooks.forEach(function (h, i) {
    h.style.animationDelay = (i * 0.7) + "s"; /* фаза 0.7s на крюк */
  });
})();
