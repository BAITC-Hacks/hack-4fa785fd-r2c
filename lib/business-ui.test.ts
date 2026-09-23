import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ProposalCard } from "@/components/ProposalCard";
import { requestJson } from "./client-api";
import { TeamsResponseSchema, type Proposal } from "./types";

afterEach(() => vi.unstubAllGlobals());

it("offers milestone confirmation only for accepted, unfinished proposals", () => {
  const proposal: Proposal = { id: "p", taskId: "t", teamId: "a", idea: "Идея", plan: "План", timeline: "Неделя", prototypeUrl: "https://example.com", createdAt: "2026-01-01T00:00:00.000Z", status: "pending", milestoneConfirmed: false };
  const render = (changes: Partial<Proposal>) => renderToStaticMarkup(createElement(ProposalCard, { proposal: { ...proposal, ...changes }, onAction: vi.fn() }));
  expect(render({})).not.toContain("Подтвердить этап");
  expect(render({ status: "accepted" })).toContain("Подтвердить этап");
  const completed = render({ status: "accepted", milestoneConfirmed: true });
  expect(completed).not.toContain("Подтвердить этап");
  expect(completed).toContain("+50 баллов начислено");
});

it("loads team data without cache and surfaces API errors", async () => {
  const team = { id: "a", name: "Команда", points: 150, skills: [], technologies: [], interests: [] };
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json([team]))
    .mockResolvedValueOnce(Response.json({ error: "Этап уже подтверждён." }, { status: 400 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await requestJson("/api/teams", TeamsResponseSchema)).toEqual([team]);
  expect(fetchMock).toHaveBeenCalledWith("/api/teams", { cache: "no-store" });
  await expect(requestJson("/api/teams", TeamsResponseSchema)).rejects.toThrow("Этап уже подтверждён.");
});
