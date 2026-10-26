<p align="center">
<img src="./apps/landing/bear.svg" height="80" width="80"/>
</p>

<p align="center">
🐻 Watchbear: The sweet way to watch together
</p>

<p align="center">
   <a href="https://chromewebstore.google.com/detail/watchbear-watch-together/ldegfikaldilbcpgmiopdnnhpkpcnepn"><b>Get it on the Chrome Web Store</b></a>
</p>

Watchbear lets you watch any video together, in sync. Start a room, share the
code, and everyone's playback stays on the same frame, with chat and reactions
in a side panel right next to the video.

This repository hosts the [watchbear.deepfeld.com](https://watchbear.deepfeld.com)
landing page.

**Build**

```bash
pnpm install
pnpm build     # copies apps/landing to dist/ and renders the blog
pnpm preview   # build, then serve dist/ on http://localhost:8080
```

**Writing a blog post**

Add a Markdown file to `apps/landing/blog/posts/`. The file name becomes the URL
(`my-post.md` → `/blog/my-post.html`). Put the cover image (1200×675 JPEG) in
`apps/landing/blog/img/` and copy the front matter from an existing post:
`title`, `description`, `dek`, `date`, `image`, `imageAlt` and `photo` are required;
`seoTitle`, `excerpt`, `featured`, `related`, `cta` and `faq` are optional. A `>`
blockquote renders as a tip box. The blog index, related posts and sitemap entries
are generated on deploy.
