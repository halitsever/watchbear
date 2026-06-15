import { useEffect, useRef, useState } from "react";
import IconSend from "~icons/lucide/send";
import IconCopy from "~icons/lucide/copy";
import IconCheck from "~icons/lucide/check";
import IconClock from "~icons/lucide/clock";
import IconTv from "~icons/lucide/tv";
import { BearMark } from "@/components/Bear";
import { MemberChip } from "@/components/MemberChip";
import { ChatLine } from "@/components/ChatLine";
import { useRoomState } from "@/hooks/useRoomState";
import { getActiveTab, getVideoTime, sendToBackground } from "@/lib/messages";
import { getIdentity, type Identity } from "@/lib/identity";
import { getServerUrl } from "@/lib/server";
import { joinRoom, type RoomConnection, type ConnStatus, type VideoContentInfo } from "@/lib/socket";
import { contentKey } from "@/lib/content";
import type { Member, Message } from "@/lib/types";

const REACTIONS = ["🐻", "😂", "😱", "❤️", "🍿"];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function SidePanel() {
  const { inRoom, roomCode } = useRoomState();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inSync] = useState(true);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [videoTime, setVideoTime] = useState<number | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [content, setContent] = useState<VideoContentInfo | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const activeTabId = useRef<number | null>(null);
  const msgId = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const conn = useRef<RoomConnection | null>(null);

  const diverged = !!content && !!activeUrl && contentKey(activeUrl) !== content.key;

  const nextId = () => ++msgId.current;

  useEffect(() => {
    getIdentity().then(setIdentity);
    getServerUrl().then(setServerUrl);
  }, []);

  // optimistic local state until the server sends the real roster
  useEffect(() => {
    if (inRoom && roomCode && identity) {
      msgId.current = 0;
      setMembers([{ ...identity, you: true, host: true }]);
      setMessages([{ id: nextId(), type: "system", text: `🐻 Bear Den opened · code ${roomCode}` }]);
    } else {
      setMembers([]);
      setMessages([]);
      setContent(null);
    }
  }, [inRoom, roomCode, identity]);

  // live room over websocket
  useEffect(() => {
    if (!inRoom || !roomCode || !identity || !serverUrl) return;
    setStatus("connecting");
    conn.current = joinRoom(serverUrl, roomCode, identity, {
      onMembers: (list, selfId) => setMembers(list.map((m) => ({ ...m, you: m.id === selfId }))),
      onChat: ({ from, text }) => setMessages((m) => [...m, { id: nextId(), type: "chat", from, text }]),
      onSystem: (text) => setMessages((m) => [...m, { id: nextId(), type: "system", text }]),
      onStatus: setStatus,
      onContent: setContent,
    });
    return () => {
      conn.current?.disconnect();
      conn.current = null;
    };
  }, [inRoom, roomCode, identity, serverUrl]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!inRoom) {
      setVideoTime(null);
      return;
    }
    let active = true;
    const poll = async () => {
      const tab = await getActiveTab();
      activeTabId.current = tab?.id ?? null;
      setActiveUrl(tab?.url ?? null);
      const res = tab?.id != null ? await getVideoTime(tab.id) : undefined;
      if (!active || res === undefined) return; // unreachable: keep last value
      setVideoTime(res?.currentTime ?? null);
    };
    poll();
    const iv = setInterval(poll, 500);
    const onActivated = () => void poll();
    chrome.tabs.onActivated.addListener(onActivated);
    return () => {
      active = false;
      clearInterval(iv);
      chrome.tabs.onActivated.removeListener(onActivated);
    };
  }, [inRoom]);

  function postChat(text: string) {
    const from = identity?.name ?? "You";
    setMessages((m) => [...m, { id: nextId(), type: "chat", from, text, mine: true }]);
    conn.current?.sendChat(text);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    postChat(text);
    setDraft("");
  }

  function copyCode() {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function leave() {
    const tab = await getActiveTab();
    sendToBackground({ type: "WB_LEAVE_ROOM", tabId: tab?.id });
  }

  function openContent() {
    if (content && activeTabId.current != null) {
      chrome.tabs.update(activeTabId.current, { url: content.url }).catch(() => {});
    }
  }

  if (!inRoom) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center font-nunito">
        <div className="opacity-60">
          <BearMark size={64} />
        </div>
        <div className="mt-4 font-fredoka text-[18px] font-semibold text-wb-text">
          Watch<span className="text-wb-honey">bear</span>
        </div>
        <div className="mt-2 text-[12.5px] font-medium leading-[1.5] text-wb-dim">Click the bear in the toolbar to start a party.</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col font-nunito">
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-wb-line px-[14px] py-[10px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <BearMark size={26} />
          <div className="min-w-0">
            <div className="font-fredoka text-[15px] font-semibold leading-none text-wb-text">Bear Den</div>
            <div className="mt-[5px] flex items-center gap-[6px]">
              <span className="text-[11px] font-bold tracking-[.5px] text-wb-dim">{roomCode}</span>
              <button type="button" onClick={copyCode} title="copy code" className="text-wb-faint transition-colors hover:text-wb-honey">
                {copied ? <IconCheck className="h-[13px] w-[13px]" /> : <IconCopy className="h-[13px] w-[13px]" />}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={leave}
          title="leave room"
          className="shrink-0 rounded-[10px] border border-wb-line bg-[#2e2018] px-3 py-1.5 text-xs font-bold text-wb-dim transition-all hover:border-[rgba(255,140,107,.3)] hover:bg-[#3a2418] hover:text-wb-coral"
        >
          Leave
        </button>
      </div>

      {status !== "connected" && (
        <div
          className={`px-[14px] py-1.5 text-center text-[11.5px] font-bold ${
            status === "error" ? "bg-[rgba(255,140,107,.12)] text-wb-coral" : "bg-[rgba(255,178,62,.1)] text-wb-honey"
          }`}
        >
          {status === "error" ? "Can't reach the server, retrying…" : "Connecting to the den…"}
        </div>
      )}

      {/* members + sync */}
      <div className="border-b border-wb-line px-[14px] py-3">
        <div className="mb-[10px] flex flex-wrap items-center gap-[7px]">
          {members.map((m) => (
            <MemberChip key={m.id ?? m.name} m={m} />
          ))}
          <span className="ml-0.5 text-[12px] font-semibold text-wb-faint">
            {members.length} {members.length === 1 ? "bear" : "bears"}
          </span>
        </div>
        <div className={`flex items-center gap-2 text-[12px] font-semibold ${inSync ? "text-wb-online" : "text-wb-honey"}`}>
          <span className={`h-2 w-2 rounded-full ${inSync ? "animate-wb-pulse bg-wb-online" : "animate-wb-spin border-2 border-wb-honey border-t-transparent"}`} />
          {inSync ? "Everyone in sync · 🍯 0.0s drift" : "Syncing…"}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-wb-dim">
          <IconClock className="h-[13px] w-[13px]" />
          {videoTime == null ? "No video playing" : formatTime(videoTime)}
        </div>

        {content &&
          (diverged ? (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[rgba(255,178,62,.3)] bg-[rgba(255,178,62,.1)] px-[11px] py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-wb-honey">You're watching something else</div>
                <div className="truncate text-[12px] font-semibold text-wb-dim">The den: {content.title || content.url}</div>
              </div>
              <button
                type="button"
                onClick={openContent}
                className="shrink-0 rounded-[10px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-3 py-1.5 text-xs font-extrabold text-[#3a2410] transition-all hover:brightness-105"
              >
                Open it
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-wb-dim">
              <IconTv className="h-[13px] w-[13px] shrink-0" />
              <span className="truncate">Now playing: {content.title || content.url}</span>
            </div>
          ))}
      </div>

      {/* chat feed */}
      <div ref={feedRef} className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[14px] py-3">
        {messages.map((msg) => (
          <ChatLine key={msg.id} msg={msg} members={members} />
        ))}
      </div>

      {/* quick reactions */}
      <div className="flex gap-1.5 px-[14px] pt-2">
        {REACTIONS.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => postChat(emoji)}
            className="flex-1 rounded-[11px] border border-wb-line bg-wb-panel py-1.5 text-[15px] transition-colors hover:border-[rgba(255,178,62,.26)] hover:bg-wb-panel2"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 p-[14px]"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the den…"
          maxLength={300}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[13px] border border-wb-line bg-[#1d150f] px-[13px] py-[10px] text-[13.5px] font-semibold text-wb-text outline-none transition-colors placeholder:text-wb-faint focus:border-[rgba(255,178,62,.45)]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="send"
          className="flex shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(180deg,#FFC156,#F2912A)] px-[13px] text-[#3a2410] transition-opacity disabled:opacity-40"
        >
          <IconSend className="h-[18px] w-[18px]" />
        </button>
      </form>
    </div>
  );
}
