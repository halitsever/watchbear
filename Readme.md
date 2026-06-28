<p align="center" class="logo-section">
<img src="./apps/extension/icons/bear.svg" height="80" width="80"/>
</br>
<img src="https://halitsever-api.vercel.app/api/repo-title?title=Watchbear">

<p align="center">
   <a href="https://chromewebstore.google.com/detail/watchbear-watch-together/ldegfikaldilbcpgmiopdnnhpkpcnepn"><img src="/.github/assets/chrome-store.png"/></a>
</p>

<p align="center">
🐻 Watchbear: The sweet way to watch together<br>
<br/>
<br/>
<img src="https://img.shields.io/github/sponsors/halitsever"/>
</p>
<p align="center">
<a align="center" href="#">Documentation</a>
  </p>
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/details"/>
</p>

Watchbear lets you watch any video together, in sync. Start a room, share the
code, and everyone's playback stays on the same frame, with chat and reactions
in a side panel right next to the video.

**Synced playback:** play, pause and seek stay in step for everyone in the room.<br/><br/>
**Join with a code:** no account; friends drop in within seconds.<br/><br/>
**Side-panel chat:** live messages and quick reactions next to the video.<br/><br/>
**Live position:** the panel shows the current second of the active tab's video.<br/><br/>

<p align="center">
<img src="/.github/assets/screenshot-rounded.png"/>
</p>

<p align="center" >
<img src="https://halitsever-api.vercel.app/api/installation"/>
</p>

Requires Node >= 20 and pnpm >= 10.

```bash
pnpm install
```

**Extension**

```bash
pnpm dev:ext
pnpm build:ext
```

Then open `chrome://extensions`, enable Developer mode, and **Load unpacked** →
`apps/extension/dist`.

**Server**

```bash
pnpm dev:server
pnpm build:server
```

**Self-hosting**

Watchbear is self-hostable. Run the server wherever you like (the
[`Server.Dockerfile`](./Server.Dockerfile) and [`server.compose.yaml`](./server.compose.yaml)
are ready to go), then point the extension at it: open the popup, click the server
row, **Change**, and enter your address (e.g. `https://watch.example.com`). It pings
the address to confirm a Watchbear server is there before switching.

The extension origin (`chrome-extension://…`) is allowed by default, so no CORS
config is needed for the client. To also allow a web origin, set `CORS_ORIGINS`
(comma-separated) on the server.

**Whole workspace**

```bash
pnpm build        # build every app
pnpm typecheck    # type-check every app
```

<p align="center" href="https://github.com/halitsever/watchbear/issues">
<img src="https://halitsever-api.vercel.app/api/issue"/>
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/sponsor"/>
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/license"/>
</p>

<p align="center">
  MIT LICENSE - Halit Sever 
</p>
