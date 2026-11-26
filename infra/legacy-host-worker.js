/** Runs on watchbear.deepfeld.com. Deployed by hand in the Cloudflare dashboard. */
const NEW_ORIGIN = "https://watchbear.net";
const ASSET = /\.(css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|json|webmanifest|mp4|webm|vtt)$/i;

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    // released extensions only join from this host, so the invite page stays here
    const stays = path === "/j" || path === "/j.html" || ASSET.test(path);
    if (!stays) return Response.redirect(NEW_ORIGIN + path + url.search, 301);

    const upstream = await fetch(NEW_ORIGIN + path + url.search, {
      method: request.method,
      headers: { accept: request.headers.get("accept") || "*/*" },
    });
    const headers = new Headers(upstream.headers);
    if (!ASSET.test(path)) headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
