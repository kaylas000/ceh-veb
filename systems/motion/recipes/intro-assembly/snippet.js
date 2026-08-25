/* intro-assembly · кинозаставка: частицы собирают слово (правила SK-06) */
(function () {
  if (sessionStorage.getItem("intro-seen") === "1") return;            /* раз в сессию */
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;  /* уважаем настройку */
  sessionStorage.setItem("intro-seen", "1");

  var cv = document.createElement("canvas");
  cv.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#0f0e0a";
  document.body.appendChild(cv);
  var skip = document.createElement("button");
  skip.textContent = "Пропустить →";
  skip.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:2147483647;padding:10px 18px";
  document.body.appendChild(skip);

  var ctx = cv.getContext("2d"), W, H, pts = [], t0 = performance.now(), DUR = 3400;
  function size() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    var off = document.createElement("canvas"), fs = Math.min(W * 0.3, H * 0.4);
    off.width = W; off.height = fs * 1.4;
    var c = off.getContext("2d");
    c.font = "900 " + fs + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#fff"; c.fillText("СТУДИЯ", W / 2, off.height / 2); /* слово клиента */
    var img = c.getImageData(0, 0, off.width, off.height); pts = [];
    for (var y = 0; y < off.height; y += 3) for (var x = 0; x < off.width; x += 3)
      if (img.data[(y * off.width + x) * 4 + 3] > 128) pts.push([x - W / 2, y - off.height / 2]);
  }
  size(); addEventListener("resize", size);
  var P = Array.from({ length: Math.min(4000, pts.length * 2) }, function () {
    var t = pts[(Math.random() * pts.length) | 0], a = Math.random() * 6.28, r = Math.max(W, H);
    return { sx: Math.cos(a) * r, sy: Math.sin(a) * r * 0.8, tx: t[0], ty: t[1], d: Math.random() * 0.4 };
  });
  var ease = function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  var done = false;
  function finish() { if (done) return; done = true; cv.remove(); skip.remove(); }
  skip.onclick = finish; addEventListener("keydown", function (e) { if (e.key === "Escape") finish(); });
  (function loop(now) {
    if (done) return;
    requestAnimationFrame(loop);
    var p = Math.min(1, (now - t0) / DUR);
    ctx.fillStyle = "#0f0e0a"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8e6de";
    for (var i = 0; i < P.length; i++) {
      var q = P[i], e = ease(Math.max(0, Math.min(1, (p - q.d) / (1 - q.d))));
      ctx.globalAlpha = 0.15 + 0.8 * e;
      ctx.fillRect(W / 2 + q.sx + (q.tx - q.sx) * e, H / 2 + q.sy + (q.ty - q.sy) * e, 2, 2);
    }
    if (p >= 1) setTimeout(finish, 500);
  })(t0);
})();
