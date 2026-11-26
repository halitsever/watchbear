# Watchbear landing page

Static landing page and blog for Watchbear, a free Chrome extension for synced watch parties, served at https://watchbear.net. The extension source is not in this repository and is no longer open source.

## Verify a change

- `pnpm install --frozen-lockfile && pnpm build` is what the Docker build runs (pnpm 11, Node 22). It writes `dist/`.
- Without a global pnpm, `npx pnpm@11.4.0 install --frozen-lockfile` matches the `packageManager` pin.
- `pnpm preview` builds and serves `dist/` on http://localhost:8080. Check pages there; there is no other CI.
- Dokploy builds the `Dockerfile` on every push to `main` and serves the result with `nginx.conf`, so a broken build on `main` means a failed deploy.
- `docker build -t watchbear-landing . && docker run --rm -p 8080:80 watchbear-landing` runs the same image locally. Send a `Host: watchbear.deepfeld.com` header to test the legacy host.

## Gotchas

- `scripts/build.mjs` copies `apps/landing/` to `dist/` and renders `apps/landing/blog/posts/*.md` into `dist/blog/`. Edit the sources, never `dist/`.
- The build fails on a post with missing front matter (`title`, `description`, `dek`, `date`, `image`, `imageAlt`, `photo.author`, `photo.url`), a missing image in `blog/img/`, a broken relative link between posts, or an unknown `related` slug. It only warns about title and description lengths.
- `apps/landing/sitemap.xml` lists the static pages only. The build appends blog posts to it, so add new static pages by hand and leave posts to the build.
- Each static page carries its own head tags, canonical URL and JSON-LD. Update them per page; there is no shared template.
- `j.html` is the room join page and is `noindex`. Keep it out of the sitemap and `llms.txt`.
- Invite links still open on `https://watchbear.deepfeld.com/j`, because released extensions only recognise that host. The first server block in `nginx.conf` serves `/j` and its assets there and redirects every other path to `https://watchbear.net`. Keep `j.html` working on both hosts.
- The owner removed open source and self-hosting mentions on purpose. Keep the site, README and `llms.txt` from presenting the extension as open source.

## Docs and site

- Site root: `apps/landing/`. `robots.txt`, `sitemap.xml` and `llms.txt` live there and are served from the domain root.
- Add a new page or post to `llms.txt` with its absolute `https://watchbear.net/` URL.

## Conventions

- Conventional-commit subject lines only, in English, with no body and no trailer.
- Work on a branch and open a pull request. The owner merges.
- No emoji in new text. Code comments are short, one line where possible, and explain why.
- The README follows the owner's template. Every image served from `halitsever-api.vercel.app` stays byte-for-byte; only the `title=` value of `api/repo-title` and the issue wrapper link may be corrected.
- Extension releases and Chrome Web Store updates are done by the owner.
