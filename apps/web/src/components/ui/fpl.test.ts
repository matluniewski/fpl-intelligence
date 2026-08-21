import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert, EmptyState, Tab, Tabs } from "./fpl";

describe("FPL UI components", () => {
  it("renders an accessible status alert with its requested tone", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Alert, { tone: "warning" }, "Data is stale"),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Data is stale");
    expect(markup).toContain("--fpl-color-status-warning-subtle");
  });

  it("renders an accessible tab list and selected tab", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        Tabs,
        null,
        React.createElement(Tab, { active: true }, "Overview"),
      ),
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
  });

  it("renders an empty state title and recovery copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EmptyState, {
        title: "No updates",
        description: "Try again later.",
      }),
    );

    expect(markup).toContain("No updates");
    expect(markup).toContain("Try again later.");
  });
});
