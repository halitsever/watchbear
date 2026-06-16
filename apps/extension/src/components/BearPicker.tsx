import { BearFace } from "./Bear";
import { BEARS } from "@/lib/identity";

export function BearPicker({
  selectedFur,
  onPick,
}: {
  selectedFur: string;
  onPick: (fur: string, furDark: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-[13px] border border-wb-line bg-[#1d150f] p-2">
      {BEARS.map((bear) => {
        const selected = bear.fur === selectedFur;
        return (
          <button
            type="button"
            key={bear.fur}
            onClick={() => onPick(bear.fur, bear.furDark)}
            title={bear.name}
            aria-label={bear.name}
            aria-pressed={selected}
            className="flex justify-center rounded-full p-0.5 transition-transform hover:-translate-y-px"
          >
            <BearFace size={28} fur={bear.fur} furDark={bear.furDark} ring={selected ? "var(--color-wb-honey)" : undefined} />
          </button>
        );
      })}
    </div>
  );
}
