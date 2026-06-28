import { useState } from "react";
import { BearFace } from "./Bear";

// falls back to the bear face if there's no photo or it fails to load (e.g. referrer-blocked)
export function Avatar({
  size,
  fur,
  furDark,
  avatar,
  ring,
}: {
  size: number;
  fur: string;
  furDark: string;
  avatar?: string;
  ring?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (!avatar || broken) {
    return <BearFace size={size} fur={fur} furDark={furDark} ring={ring} />;
  }

  return (
    <img
      src={avatar}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={{ width: size, height: size, borderRadius: "50%", display: "block", objectFit: "cover", boxShadow: ring ? `0 0 0 2.5px ${ring}` : undefined }}
    />
  );
}
