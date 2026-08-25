import {
  STAGE_0_DATASET_VERSION,
  STAGE_0_SYNTHETIC_CASES,
} from "./stage-0-synthetic-dataset.mjs";

const requiredCategories = new Set([
  "relevant_changed",
  "relevant_unchanged",
  "irrelevant",
  "duplicate",
  "stale",
  "conflict",
]);
const requiredVersions = [
  "materiality",
  "sourcePolicy",
  "recency",
  "model",
  "rules",
  "referenceData",
];
const requiredAdjudications = new Set(["correct", "incorrect", "withheld"]);
const prohibitedData = /credential|cookie|screenshot|rawContent|participant/i;
const caseIds = new Set();
const failures = [];

if (!/^stage-0-synthetic-\d{4}-\d{2}-\d{2}$/.test(STAGE_0_DATASET_VERSION)) {
  failures.push("Dataset version is not a dated Stage 0 version.");
}
if (STAGE_0_SYNTHETIC_CASES.length < 50) {
  failures.push("Stage 0 requires at least 50 cases.");
}

for (const testCase of STAGE_0_SYNTHETIC_CASES) {
  if (caseIds.has(testCase.caseId))
    failures.push(`Duplicate case: ${testCase.caseId}`);
  caseIds.add(testCase.caseId);
  if (!requiredCategories.has(testCase.category)) {
    failures.push(`Unknown category: ${testCase.caseId}`);
  }
  if (testCase.synthetic !== true)
    failures.push(`Non-synthetic case: ${testCase.caseId}`);
  if (
    !["correct", "incorrect", "withheld"].includes(
      testCase.expected.adjudication,
    )
  ) {
    failures.push(`Invalid adjudication: ${testCase.caseId}`);
  }
  for (const version of requiredVersions) {
    if (!testCase.references[version])
      failures.push(`Missing ${version}: ${testCase.caseId}`);
  }
  if (prohibitedData.test(JSON.stringify(testCase))) {
    failures.push(`Protected data marker in: ${testCase.caseId}`);
  }
}

for (const category of requiredCategories) {
  if (
    !STAGE_0_SYNTHETIC_CASES.some((testCase) => testCase.category === category)
  ) {
    failures.push(`Missing category: ${category}`);
  }
}
for (const adjudication of requiredAdjudications) {
  if (
    !STAGE_0_SYNTHETIC_CASES.some(
      (testCase) => testCase.expected.adjudication === adjudication,
    )
  ) {
    failures.push(`Missing adjudication: ${adjudication}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Stage 0 preflight failed:\n${failures.join("\n")}`);
}

console.log(
  `Stage 0 preflight passed: ${STAGE_0_SYNTHETIC_CASES.length} synthetic cases (${STAGE_0_DATASET_VERSION}).`,
);
