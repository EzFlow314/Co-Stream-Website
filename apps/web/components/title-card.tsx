"use client";

type Props = {
  game?: string;
  platform?: string;
  mode?: string;
  crewA?: string;
  crewB?: string;
  position?: "TL" | "TC" | "TR" | "BL";
};

export function TitleCard({ game, platform, mode, crewA, crewB, position = "TL" }: Props) {
  const posClass = position === "TR" ? "right-2 top-2" : position === "TC" ? "left-1/2 top-2 -translate-x-1/2" : position === "BL" ? "left-2 bottom-2" : "left-2 top-2";

  return (
    <div className={`pointer-events-none absolute z-20 ${posClass}`}>
      <div className="rounded-lg border border-[rgb(var(--ez-border))]/70 bg-black/70 px-3 py-2 shadow-[0_0_18px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="text-xs font-black tracking-wide text-[rgb(var(--ez-accent))]">{game || "Now Playing"}</p>
        <div className="flex items-center gap-2 text-[10px] text-white/80">
          <span>{platform || "OTHER"}</span>
          {mode && <span className="rounded border border-white/30 px-1 py-[1px]">{mode}</span>}
          {crewA && crewB && <span>{crewA} vs {crewB}</span>}
        </div>
      </div>
    </div>
  );
}
