/** Home page room: three real players on one film. The visitor's player leads, the other two follow it. */
(function () {
  var SRC = "img/caminandes-llamigos.webm";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var net = navigator.connection || {};
  // the clip is 4 MB, so slow or metered connections wait for a tap
  var saveData = !!net.saveData || /(^|-)(2g|3g)$/.test(net.effectiveType || "");

  var room = document.getElementById("room");
  var you = document.getElementById("filmYou");
  if (!room || !you) return;

  var followers = Array.prototype.map.call(room.querySelectorAll("video[data-follow]"), function (v) {
    return { v: v, tc: v.closest(".seat").querySelector("[data-tc]") };
  });
  var toggle = document.getElementById("filmToggle");
  var seek = document.getElementById("filmSeek");
  var time = document.getElementById("filmTime");
  var chat = document.getElementById("roomChat");
  var glow = document.getElementById("roomGlow");
  var glowCtx = glow && glow.getContext("2d");
  var splitVideo = document.getElementById("splitVideo");
  var share = document.getElementById("shareCanvas");

  function bear(fur, dark) {
    return (
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<circle cx="13" cy="13" r="7.5" fill="' + dark + '"/><circle cx="35" cy="13" r="7.5" fill="' + dark + '"/>' +
      '<circle cx="13" cy="13" r="3.4" fill="#F6E2C4"/><circle cx="35" cy="13" r="3.4" fill="#F6E2C4"/>' +
      '<circle cx="24" cy="25" r="16.5" fill="' + fur + '"/><ellipse cx="24" cy="30" rx="7" ry="5.4" fill="#F6E2C4"/>' +
      '<circle cx="18.5" cy="23.5" r="1.9" fill="#3A2412"/><circle cx="29.5" cy="23.5" r="1.9" fill="#3A2412"/>' +
      '<ellipse cx="24" cy="27.6" rx="2" ry="1.6" fill="#3A2412"/></svg>'
    );
  }
  var FRIENDS = { Ece: ["#C06B3A", "#9E5328"], Maya: ["#E6DFD2", "#C4B9A6"] };

  document.querySelectorAll(".bear[data-fur]").forEach(function (el) {
    el.innerHTML = bear(el.dataset.fur, el.dataset.dark);
  });

  /** Real clocks: the friends' cities right now, and the visitor's own time. */
  function clocks() {
    document.querySelectorAll("time[data-tz]").forEach(function (el) {
      var opts = { hour: "2-digit", minute: "2-digit", hour12: false };
      if (el.dataset.tz !== "local") opts.timeZone = el.dataset.tz;
      try {
        el.textContent = new Intl.DateTimeFormat("en-GB", opts).format(new Date());
      } catch (e) {
        el.textContent = "";
      }
    });
  }
  clocks();
  setInterval(clocks, 20000);

  function stamp(s) {
    s = Math.max(0, s || 0);
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r + "." + Math.floor((s % 1) * 10);
  }

  // what the friends type as the scene plays, keyed by film time
  var LINES = [
    [2.5, "Maya", "llamas and ice do not mix"],
    [9.3, "Ece", "and down it goes"],
    [13.5, "Maya", "wait, who is that"],
    [16.5, "Ece", "the tiniest penguin"],
    [25, "Maya", "is that a train"],
    [30.2, "Ece", "get off the tracks"],
  ];
  var lastSaid = {};

  function say(who, text) {
    if (!chat) return;
    var li = document.createElement("li");
    var f = FRIENDS[who];
    li.innerHTML = '<span class="bear">' + bear(f[0], f[1]) + "</span><span><b></b></span>";
    li.querySelector("b").textContent = who;
    li.lastChild.appendChild(document.createTextNode(text));
    chat.appendChild(li);
    while (chat.children.length > 4) chat.removeChild(chat.firstChild);
    Array.prototype.forEach.call(chat.children, function (c, i) {
      c.classList.toggle("is-old", i < chat.children.length - 2);
    });
  }

  /** a reply to something the visitor did, at most once every few seconds per kind */
  function react(kind, who, text) {
    var now = Date.now();
    if (now - (lastSaid[kind] || 0) < 6000) return;
    lastSaid[kind] = now;
    setTimeout(function () {
      say(who, text);
    }, 450);
  }

  var ready = false;
  var loading = null;
  var visible = true;
  var dragging = false;
  var prevT = 0;
  var tick = 0;

  function all() {
    return [you].concat(
      followers.map(function (f) {
        return f.v;
      }),
    );
  }

  /** One download feeds every player, and a blob can be seeked on any host. */
  function load() {
    if (loading) return loading;
    loading = fetch(SRC)
      .then(function (r) {
        if (!r.ok) throw new Error("film " + r.status);
        return r.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var vids = all();
        if (splitVideo) vids.push(splitVideo);
        return Promise.all(
          vids.map(function (v) {
            return new Promise(function (done) {
              v.addEventListener("loadeddata", done, { once: true });
              v.addEventListener("error", done, { once: true });
              v.src = url;
            });
          }),
        );
      })
      .then(function () {
        ready = true;
        paint();
      })
      .catch(function () {
        loading = null;
      });
    return loading;
  }

  function play() {
    return load().then(function () {
      if (!ready) return;
      followers.forEach(function (f) {
        f.v.currentTime = you.currentTime;
      });
      all().forEach(function (v) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
  }

  function pause() {
    all().forEach(function (v) {
      v.pause();
    });
    followers.forEach(function (f) {
      f.v.currentTime = you.currentTime;
    });
  }

  function paint() {
    var t = you.currentTime || 0;
    var d = you.duration || 1;
    time.textContent = stamp(t);
    if (!dragging) seek.value = String(Math.round((t / d) * 1000));
    seek.style.setProperty("--at", ((t / d) * 100).toFixed(2) + "%");
    followers.forEach(function (f) {
      var ft = f.v.currentTime || 0;
      var gap = Math.abs(ft - t);
      // the loop point puts the two a whole film apart for a frame
      if (gap > d / 2) gap = d - gap;
      if (ready && gap > 0.12 && !f.v.seeking) {
        f.v.currentTime = t;
        ft = t;
        gap = 0;
      }
      f.tc.textContent = stamp(ft);
      f.tc.classList.toggle("is-off", gap > 0.12);
    });
  }

  function frame() {
    if (!visible || document.hidden) return;
    var t = you.currentTime || 0;
    paint();
    if (!you.paused) {
      if (t < prevT - 1) prevT = -1;
      LINES.forEach(function (l) {
        if (prevT < l[0] && t >= l[0] && t - l[0] < 0.6) say(l[1], l[2]);
      });
      prevT = t;
      if (glowCtx && ++tick % 4 === 0) {
        try {
          glowCtx.drawImage(you, 0, 0, glow.width, glow.height);
        } catch (e) {}
      }
    }
    requestAnimationFrame(frame);
  }

  toggle.addEventListener("click", function () {
    if (you.paused) {
      play();
      react("play", "Ece", "ok, go");
    } else {
      pause();
      react("pause", "Maya", "who paused?");
    }
  });

  you.addEventListener("play", function () {
    toggle.classList.add("is-playing");
    toggle.setAttribute("aria-label", "Pause for everyone");
    requestAnimationFrame(frame);
  });
  you.addEventListener("pause", function () {
    toggle.classList.remove("is-playing");
    toggle.setAttribute("aria-label", "Play for everyone");
    paint();
  });

  seek.addEventListener("pointerdown", function () {
    dragging = true;
  });
  window.addEventListener("pointerup", function () {
    dragging = false;
  });
  seek.addEventListener("input", function () {
    load().then(function () {
      if (!ready) return;
      var from = you.currentTime;
      var to = (seek.value / 1000) * (you.duration || 0);
      all().forEach(function (v) {
        v.currentTime = to;
      });
      prevT = to;
      paint();
      if (to < from - 2) react("back", "Ece", "again, I love this part");
      else if (to > from + 2) react("ahead", "Maya", "hey, no skipping");
    });
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !you.paused) requestAnimationFrame(frame);
    }).observe(room);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !you.paused) requestAnimationFrame(frame);
  });

  // the screen share stand-in: the same film through a small, slow, late copy
  if (splitVideo && share) {
    var ctx = share.getContext("2d");
    var LATE = 7;
    var ring = [];
    var shareTimer = 0;

    function shareTick() {
      if (splitVideo.readyState < 2) return;
      var c = document.createElement("canvas");
      c.width = share.width;
      c.height = share.height;
      c.getContext("2d").drawImage(splitVideo, 0, 0, c.width, c.height);
      ring.push(c);
      if (ring.length > LATE) ctx.drawImage(ring.shift(), 0, 0);
      else if (ring.length === 1) ctx.drawImage(c, 0, 0);
    }

    var poster = new Image();
    poster.onload = function () {
      if (!ring.length) ctx.drawImage(poster, 0, 0, share.width, share.height);
    };
    poster.src = splitVideo.getAttribute("poster");

    if ("IntersectionObserver" in window && !reduce && !saveData) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            load().then(function () {
              if (!ready) return;
              var p = splitVideo.play();
              if (p && p.catch) p.catch(function () {});
              if (!shareTimer) shareTimer = setInterval(shareTick, 170);
            });
          } else {
            splitVideo.pause();
            clearInterval(shareTimer);
            shareTimer = 0;
          }
        },
        { threshold: 0.25 },
      ).observe(splitVideo);
    }
  }

  paint();
  // people who asked for less motion or less data get the still frame and a play button
  if (!reduce && !saveData) {
    if (document.readyState === "complete") play();
    else window.addEventListener("load", play, { once: true });
  }
})();
