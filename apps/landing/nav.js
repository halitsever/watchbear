// Shared Watchbear landing nav, used by every page as <wb-nav></wb-nav>.
// Single source of truth for the top navigation bar so it stays identical
// across Home, Servers and Privacy.
(function () {
  var _n = 0;

  // Self-contained copy of the bear logo, kept in sync with the pages' bearSVG.
  function bearSVG(o) {
    o = o || {};
    var size = o.size || 200;
    var u = "wbnav" + ++_n;
    var ink = o.ink || "#3A2412";
    var cheek = o.cheek || "#FF9E7A";
    var ring = o.playRing || "#E07F1C";
    var defs =
      "<defs>" +
      '<radialGradient id="' + u + 'b" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#D89A5C"/><stop offset="1" stop-color="#BC7E40"/></radialGradient>' +
      '<radialGradient id="' + u + 'h" cx="36%" cy="28%" r="82%"><stop offset="0" stop-color="#DC9E60"/><stop offset="1" stop-color="#C0823F"/></radialGradient>' +
      '<radialGradient id="' + u + 'y" cx="50%" cy="34%" r="74%"><stop offset="0" stop-color="#FFF4E2"/><stop offset="1" stop-color="#F2DEBE"/></radialGradient>' +
      '<radialGradient id="' + u + 'p" cx="50%" cy="26%" r="82%"><stop offset="0" stop-color="#FFC862"/><stop offset="1" stop-color="#F59022"/></radialGradient>' +
      '<radialGradient id="' + u + 'e" cx="50%" cy="40%" r="72%"><stop offset="0" stop-color="#C98A4B"/><stop offset="1" stop-color="#AB7037"/></radialGradient>' +
      "</defs>";
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible" aria-label="Watchbear">' +
      defs +
      '<ellipse cx="40" cy="106" rx="11" ry="9" fill="#A86B30"/><ellipse cx="80" cy="106" rx="11" ry="9" fill="#A86B30"/>' +
      '<ellipse cx="40" cy="107" rx="5.4" ry="4" fill="url(#' + u + 'y)"/><ellipse cx="80" cy="107" rx="5.4" ry="4" fill="url(#' + u + 'y)"/>' +
      '<ellipse cx="26" cy="80" rx="9.5" ry="13" fill="url(#' + u + 'e)"/><ellipse cx="94" cy="80" rx="9.5" ry="13" fill="url(#' + u + 'e)"/>' +
      '<ellipse cx="60" cy="86" rx="32" ry="27" fill="url(#' + u + 'b)"/>' +
      '<circle cx="60" cy="88" r="19" fill="url(#' + u + 'y)"/>' +
      '<circle cx="60" cy="88" r="19" fill="none" stroke="#E7CFA8" stroke-width="1.2" opacity="0.7"/>' +
      '<circle cx="60" cy="88" r="13.5" fill="url(#' + u + 'p)"/>' +
      '<circle cx="60" cy="88" r="13.5" fill="none" stroke="' + ring + '" stroke-width="2"/>' +
      '<path d="M47 84 A 13.5 13.5 0 0 1 73 84 L73 76 L47 76 Z" fill="#fff" opacity="0.22"/>' +
      '<path d="M55.4 81.5 L55.4 94.5 L67 88 Z" fill="#fff" stroke-linejoin="round"/>' +
      '<circle cx="36" cy="24" r="13" fill="url(#' + u + 'e)"/><circle cx="84" cy="24" r="13" fill="url(#' + u + 'e)"/>' +
      '<circle cx="36" cy="24" r="6.4" fill="#F6E2C4"/><circle cx="84" cy="24" r="6.4" fill="#F6E2C4"/>' +
      '<circle cx="60" cy="46" r="28" fill="url(#' + u + 'h)"/>' +
      '<ellipse cx="49" cy="33" rx="12" ry="8" fill="#fff" opacity="0.14"/>' +
      '<ellipse cx="42" cy="52" rx="6" ry="4.4" fill="' + cheek + '" opacity="0.85"/>' +
      '<ellipse cx="78" cy="52" rx="6" ry="4.4" fill="' + cheek + '" opacity="0.85"/>' +
      '<ellipse cx="60" cy="54" rx="13" ry="10" fill="url(#' + u + 'y)"/>' +
      '<circle cx="50" cy="43" r="3.6" fill="' + ink + '"/><circle cx="70" cy="43" r="3.6" fill="' + ink + '"/>' +
      '<circle cx="51.3" cy="41.6" r="1.2" fill="#fff"/><circle cx="71.3" cy="41.6" r="1.2" fill="#fff"/>' +
      '<ellipse cx="60" cy="50" rx="3.8" ry="3" fill="' + ink + '"/>' +
      '<path d="M60 53 L60 57 M60 57 C56.6 59 54.2 57.3 53.6 55.2 M60 57 C63.4 59 65.8 57.3 66.4 55.2" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
      "</svg>"
    );
  }

  var CHROME_STORE_URL =
    "https://chromewebstore.google.com/detail/watchbear-watch-together/ldegfikaldilbcpgmiopdnnhpkpcnepn";

  var LINKS = [
    { href: "index.html", label: "Home" },
    { href: "servers.html", label: "Servers" },
    { href: "privacy.html", label: "Privacy" },
    { href: "support.html", label: "Support" },
  ];

  var STYLE =
    ":host{display:block}" +
    "*{box-sizing:border-box}" +
    "a{color:inherit;text-decoration:none}" +
    ".nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(255,255,255,0.85);border-bottom:1px solid var(--line,#e8e1d3)}" +
    ".wrap{max-width:1180px;margin:0 auto;padding:0 28px}" +
    ".nav-in{display:flex;align-items:center;justify-content:space-between;height:72px}" +
    ".brand{display:flex;align-items:center;gap:10px}" +
    ".brand .mk{width:36px;height:36px;display:flex;align-items:center;justify-content:center}" +
    ".brand .mk svg{display:block}" +
    ".wordmark{font-family:\"Hanken Grotesk\",system-ui,sans-serif;font-weight:800;font-size:21px;letter-spacing:-0.02em;color:var(--ink,#1a140d)}" +
    ".wordmark .w2{color:var(--accent-text,#9a6200)}" +
    ".nav-right{display:flex;align-items:center;gap:28px}" +
    ".nav-link{font-family:\"Hanken Grotesk\",system-ui,sans-serif;font-weight:500;font-size:15px;color:var(--muted,#5c5142);transition:color 0.15s}" +
    ".nav-link:hover,.nav-link[aria-current=\"page\"]{color:var(--ink,#1a140d)}" +
    ".btn{display:inline-flex;align-items:center;gap:9px;font-family:\"Hanken Grotesk\",system-ui,sans-serif;font-weight:700;cursor:pointer;border:none;border-radius:9px;background:var(--accent,#f0a830);color:var(--on-accent,#241704);padding:10px 18px;font-size:15px;box-shadow:0 1px 2px rgba(26,20,13,0.1);transition:background 0.15s}" +
    ".btn:hover{background:var(--accent-hover,#e2991f)}" +
    ".nav-toggle{display:none;flex-direction:column;justify-content:center;gap:5px;width:42px;height:42px;padding:0 9px;background:transparent;border:1px solid var(--line-strong,#d8cfbc);border-radius:9px;cursor:pointer}" +
    ".nav-toggle span{display:block;width:100%;height:2px;background:var(--ink,#1a140d);border-radius:2px;transition:transform 0.2s,opacity 0.2s}" +
    ".nav.open .nav-toggle span:nth-child(1){transform:translateY(7px) rotate(45deg)}" +
    ".nav.open .nav-toggle span:nth-child(2){opacity:0}" +
    ".nav.open .nav-toggle span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}" +
    "@media (max-width:760px){" +
    ".nav-in{position:relative}" +
    ".nav-toggle{display:flex}" +
    ".nav-right{position:absolute;top:calc(100% + 1px);left:0;right:0;flex-direction:column;align-items:stretch;gap:4px;background:#fff;border:1px solid var(--line,#e8e1d3);border-radius:0 0 12px 12px;padding:10px;box-shadow:0 16px 40px rgba(26,20,13,0.12);display:none;z-index:50}" +
    ".nav.open .nav-right{display:flex}" +
    ".nav-right .nav-link{padding:12px 14px;border-radius:8px;font-size:15px}" +
    ".nav-right .nav-link:hover{background:var(--surface-2,#f5f1e8)}" +
    ".nav-right .btn{justify-content:center;margin-top:4px}" +
    "}";

  function currentPage() {
    var path = location.pathname;
    var file = path.substring(path.lastIndexOf("/") + 1);
    if (!file) return "index.html";
    return file;
  }

  class WbNav extends HTMLElement {
    connectedCallback() {
      var root = this.attachShadow({ mode: "open" });
      var current = currentPage();
      var links = LINKS.map(function (l) {
        var active = l.href === current ? ' aria-current="page"' : "";
        return '<a href="' + l.href + '" class="nav-link"' + active + ">" + l.label + "</a>";
      }).join("");

      root.innerHTML =
        "<style>" + STYLE + "</style>" +
        '<nav class="nav">' +
        '<div class="wrap nav-in">' +
        '<a href="index.html" class="brand" aria-label="Watchbear home">' +
        '<span class="mk">' + bearSVG({ size: 36 }) + "</span>" +
        '<span class="wordmark"><span class="w1">Watch</span><span class="w2">bear</span></span>' +
        "</a>" +
        '<div class="nav-right">' +
        links +
        '<a href="' + CHROME_STORE_URL + '" target="_blank" rel="noopener" class="btn">Add to Chrome</a>' +
        "</div>" +
        '<button class="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">' +
        "<span></span><span></span><span></span>" +
        "</button>" +
        "</nav>";

      var nav = root.querySelector(".nav");
      var toggle = root.querySelector(".nav-toggle");
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      root.querySelectorAll(".nav-right a").forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  customElements.define("wb-nav", WbNav);
})();
