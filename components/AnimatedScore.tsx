"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const displayed = useRef(value);
  useEffect(() => {
    const start = displayed.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let started: number | undefined;
    function tick(now: number) {
      started ??= now;
      const progress = reduced ? 1 : Math.min(1, (now - started) / 950);
      const next = Math.round(start + (value - start) * (1 - Math.pow(1 - progress, 3)));
      displayed.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span><span aria-hidden="true" className="score-value-pop inline-block tabular-nums" key={value}>{display}</span><span className="sr-only">{value}</span></span>;
}
