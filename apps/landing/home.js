/** Home page sync wall: four illustrated players driven by one shared clock, so pausing one pauses all. */
(function () {
  var FILM = 24 * 60;
  var TILE = 320;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** One tile of a hill line; the second copy is shifted by TILE so the layer can loop. */
  function ridge(y0, segs) {
    var d = "";
    for (var k = 0; k < 2; k++) {
      var o = k * TILE;
      if (k === 0) d += "M0 " + y0;
      segs.forEach(function (s) {
        d += " " + s[0] + " " + s.slice(1).map(function (n, i) {
          return i % 2 === 0 ? n + o : n;
        }).join(" ");
      });
    }
    return d + " L" + 2 * TILE + " 180 L0 180 Z";
  }

  function trees(y, xs) {
    var out = "";
    for (var k = 0; k < 2; k++) {
      xs.forEach(function (x) {
        var X = x + k * TILE;
        out += '<path d="M' + X + " " + (y - 26) + " L" + (X + 9) + " " + y + " L" + (X - 9) + " " + y + ' Z"/>';
        out += '<rect x="' + (X - 1.5) + '" y="' + y + '" width="3" height="6"/>';
      });
    }
    return out;
  }

  function clouds() {
    var out = "";
    for (var k = 0; k < 2; k++) {
      var o = k * TILE;
      out +=
        '<ellipse cx="' + (40 + o) + '" cy="34" rx="26" ry="7"/><ellipse cx="' + (56 + o) + '" cy="29" rx="16" ry="7"/>' +
        '<ellipse cx="' + (190 + o) + '" cy="50" rx="30" ry="6"/><ellipse cx="' + (204 + o) + '" cy="45" rx="15" ry="6"/>';
    }
    return out;
  }

  var SCENE =
    '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="SKY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1a33"/><stop offset=".62" stop-color="#e7894e"/><stop offset="1" stop-color="#f7cd80"/></linearGradient></defs>' +
    '<rect width="320" height="180" fill="url(#SKY)"/>' +
    '<circle cx="236" cy="96" r="44" fill="#ffd98f" opacity=".22"/><circle cx="236" cy="96" r="24" fill="#ffe2a6"/>' +
    '<g data-v="3" fill="#fff" opacity=".35">' + clouds() + "</g>" +
    '<path data-v="6" fill="#9a5058" d="' + ridge(118, [["C", 40, 102, 80, 104, 120, 114], ["S", 200, 98, 240, 108], ["S", 300, 124, 320, 118]]) + '"/>' +
    '<g data-balloon><path d="M0 -12 C-9 -12 -11 -2 -6 4 L-2 9 L2 9 L6 4 C11 -2 9 -12 0 -12 Z" fill="#d8b46a"/><path d="M-2 9 L-2 13 L2 13 L2 9" stroke="#3a2412" stroke-width=".8" fill="#6b3f1f"/></g>' +
    '<path data-v="14" fill="#5a2c40" d="' + ridge(140, [["C", 60, 124, 110, 128, 160, 138], ["S", 260, 122, 320, 140]]) + '"/>' +
    '<g data-v="30" fill="#1d1121"><path d="' + ridge(160, [["C", 80, 152, 160, 156, 240, 162], ["S", 300, 156, 320, 160]]) + '"/>' + trees(158, [36, 58, 150, 268]) + "</g>" +
    '<g data-bear transform="translate(112 152)" fill="#120a14"><circle cx="0" cy="-10" r="6"/><circle cx="-4.5" cy="-15" r="2.4"/><circle cx="4.5" cy="-15" r="2.4"/><ellipse cx="1" cy="-1" rx="8" ry="6.5"/></g>' +
    "</svg>";

  function mmss(s) {
    s = Math.max(0, Math.floor(s));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }

  function mount(host) {
    host.innerHTML = SCENE.replace(/SKY/g, "sky" + Math.random().toString(36).slice(2, 7));
    var svg = host.firstChild;
    return {
      layers: Array.prototype.map.call(svg.querySelectorAll("[data-v]"), function (el) {
        return { el: el, v: +el.getAttribute("data-v") };
      }),
      balloon: svg.querySelector("[data-balloon]"),
      bear: svg.querySelector("[data-bear]"),
    };
  }

  function paint(scene, st) {
    scene.layers.forEach(function (l) {
      l.el.setAttribute("transform", "translate(" + -((st * l.v) % TILE).toFixed(2) + " 0)");
    });
    var bx = 300 - ((st * 5) % 360);
    scene.balloon.setAttribute("transform", "translate(" + bx.toFixed(2) + " " + (58 + Math.sin(st / 2.2) * 5).toFixed(2) + ")");
    scene.bear.setAttribute("transform", "translate(112 " + (152 - Math.abs(Math.sin(st * 3)) * 1.6).toFixed(2) + ")");
  }

  // A blur filter for the "screen share" frame, defined once for the page.
  var defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("aria-hidden", "true");
  defs.style.position = "absolute";
  defs.innerHTML = '<filter id="shareBlur"><feGaussianBlur stdDeviation="3.6"/></filter>';
  document.body.appendChild(defs);

  document.querySelectorAll("[data-scene]").forEach(function (host) {
    paint(mount(host), +host.getAttribute("data-at") || 0);
  });

  var wall = document.getElementById("screens");
  if (!wall) return;

  var screens = Array.prototype.map.call(wall.querySelectorAll(".screen"), function (el) {
    el.innerHTML =
      '<div class="screen-head"><span><b>' + el.dataset.name + '</b> <span class="place">' + el.dataset.place + ", " + el.dataset.clock +
      '</span></span><span class="screen-sync">In sync</span></div>' +
      '<div class="frame"></div><div class="screen-buffer"></div>' +
      '<div class="screen-foot"><span class="tc">00:00</span><span class="screen-track"><i></i></span><span class="dur">24:00</span></div>';
    return {
      el: el,
      scene: mount(el.querySelector(".frame")),
      sync: el.querySelector(".screen-sync"),
      tc: el.querySelector(".tc"),
      bar: el.querySelector(".screen-track i"),
      drifts: el.hasAttribute("data-drifts"),
      lag: 0,
      buffering: false,
    };
  });

  var drifter = screens.filter(function (s) {
    return s.drifts;
  })[0];
  var btn = document.getElementById("wallPlay");
  var btnLabel = document.getElementById("wallPlayLabel");
  var status = document.getElementById("wallStatus");

  var t = 761;
  var playing = !reduce;
  var visible = true;
  var last = 0;
  var nextDrift = 6;
  var phase = "idle";
  var phaseUntil = 0;
  var clock = 0;
  var running = false;

  function setStatus(html) {
    status.innerHTML = html;
  }

  function steady() {
    setStatus(playing ? 'Four players, one frame: <b id="wallTime">' + mmss(t) + "</b> of 24:00" : "Paused for everyone at <b>" + mmss(t) + "</b>");
  }

  function render() {
    screens.forEach(function (s) {
      var st = (t - s.lag + FILM) % FILM;
      paint(s.scene, st);
      s.tc.textContent = mmss(st);
      s.bar.style.transform = "scaleX(" + (st / FILM).toFixed(4) + ")";
      s.el.classList.toggle("is-buffering", s.buffering);
      s.el.classList.toggle("is-late", s.lag > 0.25);
      s.sync.textContent = s.lag > 0.25 ? s.lag.toFixed(1) + " s behind" : "In sync";
    });
    var tw = document.getElementById("wallTime");
    if (tw && phase === "idle") tw.textContent = mmss(t);
  }

  /** The drifting player buffers, falls behind, then gets nudged back, which is what the real sync does. */
  function drift(dt) {
    if (!drifter || reduce) return;
    if (phase === "idle" && clock >= nextDrift) {
      phase = "buffer";
      phaseUntil = clock + 1.8;
      drifter.buffering = true;
      setStatus("Daniel's connection in Toronto stalls…");
    } else if (phase === "buffer") {
      drifter.lag += dt;
      if (clock >= phaseUntil) {
        phase = "late";
        phaseUntil = clock + 0.9;
        drifter.buffering = false;
        setStatus("Daniel is " + drifter.lag.toFixed(1) + " s behind the room");
      }
    } else if (phase === "late" && clock >= phaseUntil) {
      phase = "snap";
      phaseUntil = clock + 2.6;
      drifter.lag = 0;
      setStatus("Watchbear nudged Daniel's player back to <b>" + mmss(t) + "</b>");
    } else if (phase === "snap" && clock >= phaseUntil) {
      phase = "idle";
      nextDrift = clock + 9 + Math.random() * 4;
      steady();
    }
  }

  function frame(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (playing) {
      t = (t + dt) % FILM;
      clock += dt;
      drift(dt);
    }
    render();
    if (playing && visible) requestAnimationFrame(frame);
    else {
      last = 0;
      running = false;
    }
  }

  /** Observer and visibility events can both fire, so only one frame loop may run at a time. */
  function start() {
    if (running || !playing || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  }

  btn.addEventListener("click", function () {
    playing = !playing;
    btn.setAttribute("aria-pressed", String(!playing));
    btnLabel.textContent = playing ? "Pause for everyone" : "Play for everyone";
    if (!playing && phase !== "idle") {
      screens.forEach(function (s) {
        s.lag = 0;
        s.buffering = false;
      });
      phase = "idle";
      nextDrift = clock + 6;
    }
    steady();
    render();
    start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      start();
    }).observe(wall);
  }
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    start();
  });

  btn.setAttribute("aria-pressed", String(!playing));
  btnLabel.textContent = playing ? "Pause for everyone" : "Play for everyone";
  steady();
  render();
  start();
})();
