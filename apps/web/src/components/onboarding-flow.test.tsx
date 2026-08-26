import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OnboardingFlow } from "./onboarding-flow";

describe("OnboardingFlow", () => {
  it("renders the approved upload and complete manual fallback entry points", () => {
    const markup = renderToStaticMarkup(<OnboardingFlow />);

    expect(markup).toContain("Import your FPL squad");
    expect(markup).toContain("Choose screenshot");
    expect(markup).toContain("Enter team manually");
    expect(markup).toContain("Your screenshot is temporary");
    expect(markup).toContain("No FPL login required");
  });
});
