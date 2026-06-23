// emojis the reaction picker can send as floating reactions over the video.
// MUST stay in sync with the REACTIONS allowlist in the server gateway
// (apps/server/src/room/room.gateway.ts) or the server drops anything extra.
export const REACTION_EMOJI = [
  '🐻', '😂', '❤️', '😱', '😢', '😍', '😡', '👍', '👎', '🔥',
  '🎉', '👏', '🙌', '🤯', '😴', '🥱', '🤔', '😮', '😅', '😭',
  '🥺', '😎', '🤩', '😇', '🙃', '😏', '😬', '🤣', '💀', '👀',
  '✨', '⭐', '💯', '🙏', '🤝', '💪', '🍿', '☕', '🎬', '📺',
  '🐾', '🍯', '🌙', '⚡', '💖', '💔', '🫶', '🤡', '🥳', '😤',
];

// the strip shown inline above the composer; the picker exposes the full set
export const QUICK_REACTIONS = ['🐻', '😂', '❤️', '😱', '😢', '😍', '😡'];
