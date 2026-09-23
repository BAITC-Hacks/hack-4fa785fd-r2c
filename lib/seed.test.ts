import { describe, expect, it } from "vitest";
import seedJson from "../data/seed.json";
import { calculateScore } from "./scoring";
import { DatabaseSchema } from "./types";

const seed = DatabaseSchema.parse(seedJson);

describe("synthetic seed data", () => {
  it("contains at least five drafts across industries and degrees of completeness", () => {
    const drafts = seed.tasks.filter((task) => task.status === "draft");
    expect(drafts.length).toBeGreaterThanOrEqual(5);
    expect(new Set(drafts.map((task) => task.industry)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(drafts.map((task) => task.score.total)).size).toBeGreaterThanOrEqual(5);
    for (const draft of drafts) {
      expect(draft.draftText.trim().length).toBeGreaterThan(0);
      expect(draft.publishedAt).toBeUndefined();
    }
  });

  it("contains at least five published cards spanning all four levels", () => {
    const published = seed.tasks.filter((task) => task.status === "published");
    expect(published.length).toBeGreaterThanOrEqual(5);
    expect(new Set(published.map((task) => task.score.level)))
      .toEqual(new Set(["draft", "workable", "ready", "priority"]));
    for (const task of published) {
      expect(task.card.title.confirmed).toBe(true);
      expect(task.card.title.value.trim().length).toBeGreaterThan(0);
      expect(task.publishedAt).toBeDefined();
    }
  });

  it("stores the exact current score breakdown and last history total", () => {
    for (const task of seed.tasks) {
      expect(task.score, task.id).toEqual(calculateScore(task.card));
      expect(task.scoreHistory.at(-1)?.total, task.id).toBe(task.score.total);
      const timestamps = task.scoreHistory.map((entry) => Date.parse(entry.at));
      expect(timestamps, task.id).toEqual([...timestamps].sort((a, b) => a - b));
    }
  });

  it("has five complete team profiles and proposals with valid unique references", () => {
    expect(seed.teams.length).toBeGreaterThanOrEqual(5);
    expect(seed.proposals.length).toBeGreaterThanOrEqual(5);
    for (const rows of [seed.tasks, seed.teams, seed.proposals]) {
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    }
    for (const team of seed.teams) {
      expect(team.name.trim()).not.toBe("");
      expect(team.interests.length).toBeGreaterThan(0);
      expect(team.skills.length).toBeGreaterThan(0);
      expect(team.technologies.length).toBeGreaterThan(0);
    }
    for (const proposal of seed.proposals) {
      expect(seed.tasks.find((task) => task.id === proposal.taskId)?.status).toBe("published");
      expect(seed.teams.some((team) => team.id === proposal.teamId)).toBe(true);
      for (const value of [proposal.idea, proposal.plan, proposal.timeline]) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
      // Reserved example domains make it explicit that links are synthetic.
      expect(new URL(proposal.prototypeUrl).hostname).toBe("example.invalid");
      if (proposal.milestoneConfirmed) expect(proposal.status).toBe("accepted");
    }
  });

  it("awards precisely 50 points per confirmed accepted milestone", () => {
    expect(seed.proposals.some((proposal) => proposal.milestoneConfirmed)).toBe(true);
    for (const team of seed.teams) {
      const confirmed = seed.proposals.filter((proposal) =>
        proposal.teamId === team.id && proposal.status === "accepted" && proposal.milestoneConfirmed,
      ).length;
      expect(team.points, team.id).toBe(confirmed * 50);
    }
    expect(seed.aiLogs).toEqual([]);
  });
});
