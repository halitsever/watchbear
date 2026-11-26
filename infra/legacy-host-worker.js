/** Runs on watchbear.deepfeld.com. Deployed by hand in the Cloudflare dashboard (worker watchbear-legacy-host). */
const NEW_HOST = "watchbear.net";
const REDIRECT = true;
const ASSET = /\.(css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|json|webmanifest|mp4|webm|vtt)$/i;

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    const invite = path === "/j" || path === "/j.html";
    // released extensions only join from this host, so the invite page stays here
    if (REDIRECT && !invite && !ASSET.test(path)) {
      return Response.redirect("https://" + NEW_HOST + path + url.search, 301);
    }
    const target = NEW_HOST + path + url.search;
    const init = { method: request.method, headers: { accept: request.headers.get("accept") || "*/*" } };
    let upstream;
    try {
      upstream = await fetch("https://" + target, init);
      if (upstream.status >= 520) throw new Error("tls");
    } catch (e) {
      upstream = await fetch("http://" + target, init);
    }
    const headers = new Headers(upstream.headers);
    if (invite) headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
