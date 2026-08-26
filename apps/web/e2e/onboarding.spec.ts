import { expect, test } from "@playwright/test";

const minimalPng = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1,
]);

async function continueAndConfirm(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Continue with complete squad" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Add your game state" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm your corrected team" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm TeamState" }).click();
  await expect(
    page.getByRole("heading", { name: "Your TeamState is confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open illustrative news workspace" }),
  ).toBeVisible();
}

async function completeSquadAndConfirm(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Use illustrative complete squad" })
    .click();
  await continueAndConfirm(page);
}

test("validates a screenshot and requires candidate review", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page.locator('input[type="file"]').setInputFiles({
    name: "squad.png",
    mimeType: "image/png",
    buffer: minimalPng,
  });
  await expect(page.getByText("Validated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue extraction" }).click();
  await page.getByRole("button", { name: "Show candidate" }).click();
  await expect(
    page.getByRole("heading", { name: "Review the provisional squad" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Defender 2" })
    .selectOption("onboarding-demo-player-4");
  await page
    .getByRole("combobox", { name: "Forward 2" })
    .selectOption("onboarding-demo-player-14");
  await continueAndConfirm(page);
});

test("recovers from an invalid file through manual entry", async ({ page }) => {
  await page.goto("/onboarding");
  await page.locator('input[type="file"]').setInputFiles({
    name: "not-an-image.txt",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByText("This file cannot be used")).toBeVisible();
  await page.getByRole("button", { name: "Enter team manually" }).click();
  await completeSquadAndConfirm(page);
});

test("completes onboarding without a screenshot", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Enter team manually" }).click();
  await expect(
    page.getByRole("heading", { name: "Enter the full squad manually" }),
  ).toBeVisible();
  await completeSquadAndConfirm(page);
});
