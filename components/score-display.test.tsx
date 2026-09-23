import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ScoreMeter } from "./ScoreMeter";
import { ScoreHistory } from "./ScoreHistory";
import { getLevel } from "../lib/levels";

it("shows the next threshold and the maximum level at every boundary", () => {
  for (const [total, message] of [
    [0, "До уровня «Рабочая» осталось 40 баллов"],
    [39, "До уровня «Рабочая» осталось 1 баллов"],
    [40, "До уровня «Готовая» осталось 30 баллов"],
    [69, "До уровня «Готовая» осталось 1 баллов"],
    [70, "До уровня «Приоритетная» осталось 20 баллов"],
    [89, "До уровня «Приоритетная» осталось 1 баллов"],
    [90, "Максимальный уровень"], [100, "Максимальный уровень"],
  ] as const) {
    expect(renderToStaticMarkup(<ScoreMeter score={{ total, potential: total, level: getLevel(total), blocks: [], missing: [] }} />)).toContain(message);
  }
  expect(renderToStaticMarkup(<ScoreMeter />)).not.toContain("Максимальный уровень");
});

it("renders score changes with timestamps, keeps decreases and handles empty history", () => {
  const history = [0, 80, 80, 100, 70].map((total, index) => ({ total, at: `2026-09-23T10:0${index}:00.000Z` }));
  const html = renderToStaticMarkup(<ScoreHistory history={history} />);
  expect(html).toContain("Рост рейтинга: 0 → 80 → 100 → 70");
  expect(html.match(/<time /g)).toHaveLength(4);
  expect(html).toContain("15:03:00");
  expect(renderToStaticMarkup(<ScoreHistory history={[]} />)).toContain("История появится");
});
