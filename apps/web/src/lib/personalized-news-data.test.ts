import { describe, expect, it } from "vitest";

import { stateMessage } from "./personalized-news-data";

describe("personalized news recovery states", () => {
  it("explains every non-current state without suggesting a fallback feed", () => {
    for (const state of [
      "loading",
      "empty",
      "stale",
      "partial",
      "quarantined",
    ] as const) {
      expect(stateMessage(state)).not.toHaveLength(0);
      expect(stateMessage(state)).not.toContain("fallback");
    }
  });
});
