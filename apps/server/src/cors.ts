type OriginCb = (err: Error | null, allow?: boolean) => void;

const allowList = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// the extension reaches us from chrome-extension://<id>, and that id changes
// between dev and a packed build, so we allow any extension origin plus whatever
// web origins are configured. requests with no Origin (native socket.io clients,
// the container health check) pass through; a regular website's http(s) origin
// does not match and gets rejected.
export function corsOrigin(origin: string | undefined, cb: OriginCb): void {
  if (!origin || origin.startsWith('chrome-extension://') || allowList.includes(origin)) {
    cb(null, true);
    return;
  }
  cb(null, false);
}
