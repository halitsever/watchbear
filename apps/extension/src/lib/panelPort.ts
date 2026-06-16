export const PANEL_PORT_NAME = 'wb_sidepanel';

// the service worker watches this port; when the side panel closes the port
// drops and the worker treats it as leaving the room. the heartbeat keeps an
// idle port from being recycled by chrome and faking a disconnect.
export function connectPanelPort(): chrome.runtime.Port {
  const port = chrome.runtime.connect({ name: PANEL_PORT_NAME });
  const iv = setInterval(() => {
    try {
      port.postMessage({ t: 'ping' });
    } catch {
      clearInterval(iv);
    }
  }, 20_000);
  return port;
}
