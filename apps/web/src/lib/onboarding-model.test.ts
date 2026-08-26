import { describe, expect, it } from "vitest";

import {
  confirmOnboardingCandidate,
  createOnboardingCandidate,
  illustrativeSelections,
  screenshotCandidateSelections,
  selectionIssue,
} from "./onboarding-model";

describe("onboarding model", () => {
  it("requires all screenshot ambiguities to be resolved", () => {
    expect(selectionIssue(screenshotCandidateSelections())).toBe(
      "Select all 15 players before continuing.",
    );
  });

  it("rejects duplicate players", () => {
    const selections = [...illustrativeSelections()];
    selections[1] = selections[0]!;
    expect(selectionIssue(selections)).toBe(
      "Each player can appear only once in the squad.",
    );
  });

  it("creates a provisional application candidate and confirms it explicitly", () => {
    const candidate = createOnboardingCandidate({
      selections: illustrativeSelections(),
      bankTenths: 5,
      freeTransfers: 2,
      activeChip: null,
      candidateId: "candidate-test",
      enteredAt: "2026-08-26T09:00:00Z",
    });
    expect(candidate.kind).toBe("candidate");
    expect(candidate.squad).toHaveLength(15);

    const confirmed = confirmOnboardingCandidate({
      candidate,
      teamStateId: "team-state-test",
      confirmedAt: "2026-08-26T09:01:00Z",
    });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.teamState.kind).toBe("confirmed");
      expect(confirmed.teamState.squad).toHaveLength(15);
    }
  });
});
