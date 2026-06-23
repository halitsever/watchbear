// runs in the page MAIN world (manifest world:'MAIN') so it can reach netflix's
// private player api. the isolated content script (main.ts) reads/writes the
// <video> tag for everything except seeking. writing video.currentTime crashes
// netflix, so it asks us to drive player.seek() instead.

interface NetflixPlayer {
  seek(ms: number): void;
}

interface NetflixVideoPlayer {
  getAllPlayerSessionIds(): string[];
  getVideoPlayerBySessionId(id: string): NetflixPlayer;
}

interface NetflixGlobal {
  appContext?: { state?: { playerApp?: { getAPI?: () => { videoPlayer?: NetflixVideoPlayer } } } };
}

function getNetflixPlayer(): NetflixPlayer | null {
  try {
    const vp = (window as Window & { netflix?: NetflixGlobal }).netflix?.appContext?.state?.playerApp
      ?.getAPI?.()
      .videoPlayer;
    const id = vp?.getAllPlayerSessionIds()[0];
    return id && vp ? vp.getVideoPlayerBySessionId(id) : null;
  } catch {
    return null;
  }
}

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data as { __wbnf?: number; kind?: string; time?: number } | undefined;
  if (!d || d.__wbnf !== 1 || d.kind !== 'seek' || typeof d.time !== 'number') return;
  try {
    getNetflixPlayer()?.seek(Math.round(d.time * 1000)); // netflix wants milliseconds
  } catch {
    // player not ready or api shape changed; ignore, next sync tick retries
  }
});

export {};
