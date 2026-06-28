import { BearFace } from "./Bear";
import { BEARS } from "@/lib/identity";

// google photo (if any) then bear colors; picking one clears the other
export function BearPicker({
  selectedFur,
  onPick,
  googlePhoto,
  usingPhoto,
  onPickPhoto,
}: {
  selectedFur: string;
  onPick: (fur: string, furDark: string) => void;
  googlePhoto?: string | null;
  usingPhoto?: boolean;
  onPickPhoto?: () => void;
}) {
  const ring = "var(--color-wb-honey)";
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-[13px] border border-wb-line bg-[#1d150f] p-2">
      {googlePhoto && onPickPhoto && (
        <button
          type="button"
          onClick={onPickPhoto}
          title="Your Google photo"
          aria-label="Your Google photo"
          aria-pressed={usingPhoto}
          className="flex animate-wb-pop-in justify-center rounded-full p-0.5 transition-transform hover:-translate-y-px hover:scale-110 active:scale-90"
        >
          <img
            src={googlePhoto}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full object-cover"
            style={{ boxShadow: usingPhoto ? `0 0 0 2.5px ${ring}` : undefined }}
          />
        </button>
      )}
      {BEARS.map((bear, i) => {
        const selected = !usingPhoto && bear.fur === selectedFur;
        return (
          <button
            type="button"
            key={bear.fur}
            onClick={() => onPick(bear.fur, bear.furDark)}
            title={bear.name}
            aria-label={bear.name}
            aria-pressed={selected}
            style={{ animationDelay: `${i * 30}ms` }}
            className="flex animate-wb-pop-in justify-center rounded-full p-0.5 transition-transform hover:-translate-y-px hover:scale-110 active:scale-90"
          >
            <BearFace size={28} fur={bear.fur} furDark={bear.furDark} ring={selected ? ring : undefined} />
          </button>
        );
      })}
    </div>
  );
}
