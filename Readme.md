<p align="center">
<img src="./apps/landing/bear.svg" height="80" width="80"/>
</p>

<p align="center">
🐻 Watchbear: The sweet way to watch together
</p>

<p align="center">
   <a href="https://chromewebstore.google.com/detail/watchbear-watch-together/ldegfikaldilbcpgmiopdnnhpkpcnepn"><b>Get it on the Chrome Web Store</b></a>
</p>

> [!CAUTION]
> New versions of Watchbear are no longer released as open source. Development
> continues privately so the project can keep going, and the extension still gets
> updates on the Chrome Web Store.

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
