import { useState } from "react";
import IconGlobe from "~icons/lucide/globe";
import IconCheck from "~icons/lucide/check";
import IconTriangleAlert from "~icons/lucide/triangle-alert";
import { useServerUrl } from "@/hooks/useServerUrl";
import { DEFAULT_SERVER_URL, normalizeServerUrl, resetServerUrl, setServerUrl } from "@/lib/server";
import { pingServer } from "@/lib/socket";

type Status = "idle" | "checking" | "ok" | "warn" | "invalid";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function ServerSettings({ onChange }: { onChange?: () => void }) {
  const current = useServerUrl();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function startEdit() {
    setDraft(current ?? "");
    setStatus("idle");
    setOpen(true);
  }

  async function save() {
    const url = normalizeServerUrl(draft);
    if (!url) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    const ok = await pingServer(url);
    // save either way: a self-hosted server might just not be up yet
    await setServerUrl(url);
    setStatus(ok ? "ok" : "warn");
    onChange?.();
  }

  async function reset() {
    await resetServerUrl();
    setStatus("idle");
    setOpen(false);
    onChange?.();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="flex w-full items-center gap-2 rounded-[13px] border border-wb-line bg-[#1d150f] px-[13px] py-2.5 text-left transition-colors hover:border-[rgba(255,178,62,.28)]"
      >
        <IconGlobe className="h-[15px] w-[15px] shrink-0 text-wb-faint" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-wb-dim">{current ? hostOf(current) : "…"}</span>
        <span className="shrink-0 text-[12px] font-bold text-wb-honey">Change</span>
      </button>
    );
  }

  return (
    <div className="rounded-[13px] border border-wb-line bg-[#1d150f] p-[11px]">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-wb-dim">
        <IconGlobe className="h-[15px] w-[15px] text-wb-faint" />
        Watchbear server
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setStatus("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
          placeholder="https://your-server.com"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-[10px] border border-wb-line bg-[#150f0a] px-[11px] py-2 text-[12.5px] font-semibold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.5)]"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "checking"}
          className="shrink-0 rounded-[10px] bg-[#3a2c20] px-3.5 text-[12.5px] font-extrabold text-wb-cream transition-colors hover:bg-[#4a3826] disabled:opacity-40"
        >
          Save
        </button>
      </div>

      {status === "invalid" && (
        <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[rgba(255,140,107,.25)] bg-[rgba(255,140,107,.1)] px-2.5 py-2 text-[11.5px] font-bold text-wb-coral">
          <IconTriangleAlert className="h-[14px] w-[14px] shrink-0" />
          Enter a valid http(s) address.
        </div>
      )}
      {status === "warn" && (
        <div className="mt-2 flex items-center gap-2 rounded-[10px] border border-[rgba(255,178,62,.28)] bg-[rgba(255,178,62,.1)] px-2.5 py-2 text-[11.5px] font-bold text-wb-honey">
          <IconTriangleAlert className="h-[14px] w-[14px] shrink-0" />
          Saved, but couldn't reach a Watchbear server there.
        </div>
      )}
      {status === "ok" && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-wb-online">
          <IconCheck className="h-[14px] w-[14px]" />
          Connected.
        </div>
      )}
      {status === "checking" && <div className="mt-2 text-[11.5px] font-bold text-wb-dim">Checking…</div>}

      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => setOpen(false)} className="text-[11.5px] font-bold text-wb-faint transition-colors hover:text-wb-dim">
          Cancel
        </button>
        {current !== DEFAULT_SERVER_URL && (
          <button type="button" onClick={() => void reset()} className="text-[11.5px] font-bold text-wb-faint transition-colors hover:text-wb-honey">
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}
