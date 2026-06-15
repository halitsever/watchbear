import { useEffect, useRef, useState } from "react";
import IconPanelRight from "~icons/lucide/panel-right-open";
import IconPlay from "~icons/lucide/play";
import IconVideoOff from "~icons/lucide/video-off";
import { BearMark, BearFace } from "@/components/Bear";
import { useRoomState } from "@/hooks/useRoomState";
import { getActiveTab, getVideoTime, sendToBackground } from "@/lib/messages";
import { generateCode } from "@/lib/room";
import { getIdentity, setIdentityName, setIdentityCharacter, type Identity } from "@/lib/identity";
import { getServerUrl } from "@/lib/server";
import { pingServer } from "@/lib/socket";
import { ServerSettings } from "@/components/ServerSettings";
import { BearPicker } from "@/components/BearPicker";

export function Popup() {
  const { inRoom, roomCode } = useRoomState();
  const [code, setCode] = useState("");
  const [you, setYou] = useState<Identity | null>(null);
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const activeTab = useRef<chrome.tabs.Tab | undefined>(undefined);

  // cache the tab so the open handler stays a sync user gesture
  useEffect(() => {
    getActiveTab().then((t) => {
      activeTab.current = t;
      if (t?.id != null) getVideoTime(t.id).then((res) => setHasVideo(!!res));
      else setHasVideo(false);
    });
    getIdentity().then(setYou);
    refreshServer();
  }, []);

  function refreshServer() {
    getServerUrl()
      .then((u) => pingServer(u))
      .then(setServerUp);
  }

  function changeName(value: string) {
    setYou((y) => (y ? { ...y, name: value } : y));
    void setIdentityName(value);
  }

  function chooseBear(fur: string, furDark: string) {
    setYou((y) => (y ? { ...y, fur, furDark } : y));
    void setIdentityCharacter(fur, furDark);
  }

  // re-verify the server right before acting, so we never close the popup into a
  // dead connection; on failure we surface the banner instead.
  async function ensureServer(): Promise<boolean> {
    if (serverUp === true) return true;
    const ok = await pingServer(await getServerUrl());
    setServerUp(ok);
    return ok;
  }

  async function startRoom() {
    if (!(await ensureServer())) return;
    const tab = await getActiveTab();
    if (!tab?.id) return;
    sendToBackground({ type: "WB_START_ROOM", code: generateCode(), tabId: tab.id });
    window.close();
  }

  async function joinRoom() {
    const trimmed = code.trim();
    if (trimmed.length < 3) return;
    if (!(await ensureServer())) return;
    const tab = await getActiveTab();
    if (!tab?.id) return;
    sendToBackground({ type: "WB_JOIN_ROOM", code: trimmed, tabId: tab.id });
    window.close();
  }

  function leaveRoom() {
    sendToBackground({ type: "WB_LEAVE_ROOM", tabId: activeTab.current?.id });
  }

  function openSidePanel() {
    const tabId = activeTab.current?.id;
    if (!tabId) return;
    chrome.sidePanel.open({ tabId }).catch(() => {});
    window.close();
  }

  return (
    <div className="font-nunito">
      <div className="pointer-events-none absolute -top-[7px] right-[30px] z-[1] h-[14px] w-[14px] rotate-45 border-l border-t border-[rgba(255,200,140,.12)] bg-[#2c211a]" />

      {/* header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_50%_35%,#3a2a1d,#271b12)] shadow-[inset_0_0_0_1px_rgba(255,200,140,.12)]">
          <BearMark size={34} />
        </div>
        <div className="flex-1">
          <div className="font-fredoka text-[19px] font-semibold leading-none text-wb-text">
            Watch<span className="text-wb-honey">bear</span>
          </div>
          <div className="mt-[3px] text-[11.5px] font-medium text-wb-dim">the sweet way to watch together</div>
        </div>
        <span title="connected" className="h-[9px] w-[9px] shrink-0 rounded-full bg-wb-online shadow-[0_0_0_4px_rgba(123,201,111,.16)]" />
      </div>

      {inRoom ? (
        /* active room banner */
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-xl border border-[rgba(123,201,111,.24)] bg-[rgba(123,201,111,.1)] px-[13px] py-[10px]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 animate-wb-pulse rounded-full bg-wb-online" />
            <span className="shrink-0 text-[12.5px] font-bold text-[#9fd98f]">Room active</span>
            <span className="truncate text-xs font-extrabold tracking-[.5px] text-wb-dim">{roomCode}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openSidePanel}
              className="flex items-center gap-1 rounded-[10px] border border-[rgba(255,178,62,.3)] bg-[rgba(255,178,62,.12)] px-2.5 py-1.5 text-xs font-bold text-wb-honey transition-all hover:bg-[rgba(255,178,62,.2)]"
            >
              <IconPanelRight className="h-[14px] w-[14px]" />
              Go to room
            </button>
            <button
              type="button"
              onClick={leaveRoom}
              className="rounded-[10px] border border-wb-line bg-[#2e2018] px-3 py-1.5 text-xs font-bold text-wb-dim transition-all hover:border-[rgba(255,140,107,.3)] hover:bg-[#3a2418] hover:text-wb-coral"
            >
              Leave
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* body */}
          <div className="px-4">
            {serverUp === false && (
              <div className="mb-[11px] rounded-xl border border-[rgba(255,140,107,.25)] bg-[rgba(255,140,107,.1)] px-[13px] py-2.5 text-center text-[12px] font-bold text-wb-coral">
                Can't reach the server. Try again later.
              </div>
            )}
            <div className="mb-[11px] flex items-center gap-2">
              <BearFace
                size={30}
                fur={you?.fur ?? "#B97C43"}
                furDark={you?.furDark ?? "#9A6230"}
                ring="var(--color-wb-honey)"
              />
              <input
                value={you?.name ?? ""}
                onChange={(e) => changeName(e.target.value)}
                placeholder="your bear name"
                maxLength={20}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-wb-line bg-[#1d150f] px-[13px] py-[10px] text-[13.5px] font-bold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)]"
              />
            </div>
            <div className="mb-[11px]">
              <div className="mb-1.5 text-[11px] font-bold text-wb-faint">Pick your bear</div>
              <BearPicker selectedFur={you?.fur ?? ""} onPick={chooseBear} />
            </div>
            <button
              type="button"
              onClick={startRoom}
              disabled={hasVideo === false || serverUp === false}
              className="flex w-full items-center justify-between gap-2 rounded-[14px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-4 py-[14px] text-[14.5px] font-extrabold text-[#3a2410] shadow-[0_8px_20px_rgba(242,145,42,.32)] transition-all hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:cursor-default disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100"
            >
              <span className="flex items-center gap-[9px]">
                <IconPlay className="h-[17px] w-[17px]" />
                Start a party with this video
              </span>
            </button>
            {hasVideo === false && (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,178,62,.28)] bg-[rgba(255,178,62,.1)] px-[13px] py-2.5 text-[12.5px] font-bold text-wb-honey">
                <IconVideoOff className="h-[15px] w-[15px] shrink-0" />
                No video playing on this page
              </div>
            )}

            <div className="mt-[11px] flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") joinRoom();
                }}
                placeholder="ROOM CODE"
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-wb-line bg-[#1d150f] px-[13px] py-[11px] text-[13.5px] font-extrabold uppercase tracking-[1.5px] text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.5)]"
              />
              <button
                type="button"
                onClick={joinRoom}
                disabled={code.trim().length < 3 || serverUp === false}
                className="whitespace-nowrap rounded-xl bg-[#3a2c20] px-4 text-[13.5px] font-extrabold text-wb-cream transition-colors hover:bg-[#4a3826] disabled:cursor-default disabled:opacity-40"
              >
                Join
              </button>
            </div>
          </div>

          {/* share hint */}
          <div className="px-4 pt-[14px]">
            <div className="flex items-start gap-[9px] rounded-[13px] border border-wb-line bg-[#1d150f] px-[13px] py-3 text-[12.5px] font-semibold leading-[1.45] text-wb-dim">
              <span className="shrink-0 text-[15px] leading-none">🍯</span>
              <span>You'll get a code when you create a room. Send it to your friends so everyone watches in sync.</span>
            </div>
          </div>

          {/* server picker (self-host) */}
          <div className="px-4 pb-[18px] pt-2.5">
            <ServerSettings onChange={refreshServer} />
          </div>
        </>
      )}
    </div>
  );
}
