type OriginCb = (err: Error | null, allow?: boolean) => void;

const allowList = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// the extension's chrome-extension://<id> origin changes between dev and packed
// builds, so allow any extension origin plus configured web origins. no-Origin
// requests (native socket.io, health check) pass; other websites' origins don't.
export function corsOrigin(origin: string | undefined, cb: OriginCb): void {
  if (!origin || origin.startsWith('chrome-extension://') || allowList.includes(origin)) {
    cb(null, true);
    return;
  }
  cb(null, false);
}
