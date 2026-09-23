import type { CSSProperties } from "react";
import { Sparkles, Trophy } from "lucide-react";

export function LevelCelebration({ message, detail }: { message: string; detail?: string }) {
  return <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
    <div role="status" aria-live="polite" aria-atomic="true" className="level-celebration relative rounded-3xl border border-emerald-300/70 bg-emerald-950 p-6 text-white shadow-xl">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl">
        {Array.from({ length: 28 }, (_, index) => <span key={index} className="level-confetti" style={{
          "--particle-x": `${(index % 8 - 3.5) * 50}px`,
          "--particle-y": `${-60 - (index % 5) * 30}px`,
          "--particle-turn": `${index % 2 ? 220 : -220}deg`,
          left: `${5 + index * 3.3}%`,
          background: ["#bef264", "#6ee7b7", "#67e8f9", "#fde68a"][index % 4],
          animationDelay: `${180 + (index % 7) * 65}ms`,
        } as CSSProperties} />)}
      </div>
      <div className="relative flex items-center gap-5">
        <div className="relative shrink-0"><span className="level-achievement-ring" aria-hidden="true" /><span className="level-achievement-ring level-achievement-ring-delayed" aria-hidden="true" /><span className="level-trophy relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-200 via-lime-200 to-emerald-300 text-emerald-950 shadow-lg"><Trophy className="size-9" aria-hidden="true" /><Sparkles className="level-sparkle absolute -right-2 -top-2 size-6 text-yellow-200" aria-hidden="true" /></span></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-300">Новый уровень готовности</p><p className="mt-2 text-xl font-semibold">{message}</p>{detail && <p className="mt-1 text-sm text-emerald-100">{detail}</p>}</div>
      </div>
      <div aria-hidden="true" className="mt-4 h-0.5 overflow-hidden rounded-full bg-white/10"><div className="level-notice-timer h-full origin-left bg-emerald-300" /></div>
    </div>
  </div>;
}
