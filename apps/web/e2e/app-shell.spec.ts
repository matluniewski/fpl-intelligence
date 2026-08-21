import { expect, test } from "@playwright/test";

test("renders the desktop application shell with accessible navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "News intelligence" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Refresh data" }),
  ).toBeVisible();
  await expect(page.getByLabel("Data freshness")).toBeVisible();
});

test("keeps navigation keyboard-accessible on a small screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByText("Navigation", { exact: true }).press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Mobile primary navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "News intelligence" }).focus();
  await expect(
    page.getByRole("link", { name: "News intelligence" }),
  ).toBeFocused();
});
