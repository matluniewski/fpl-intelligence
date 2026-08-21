import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders accessible navigation and freshness states without product data", () => {
    const markup = renderToStaticMarkup(
      <AppShell
        navigation={[{ href: "/", label: "Overview", active: true }]}
        pageTitle="Preview"
        pageDescription="Illustrative shell preview"
        seasonLabel="Illustrative season"
        gameweekLabel="Illustrative gameweek"
        statuses={[
          {
            state: "stale",
            label: "Data needs refresh",
            detail: "Illustrative status",
          },
        ]}
      >
        <p>Content</p>
      </AppShell>,
    );

    expect(markup).toContain('aria-label="Primary navigation"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-label="Data freshness"');
    expect(markup).toContain("Refresh data");
  });
});
