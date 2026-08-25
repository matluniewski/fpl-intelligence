export const STAGE_0_DATASET_VERSION = "stage-0-synthetic-2026-08-25";

const versions = Object.freeze({
  materiality: "validation-materiality-1",
  sourcePolicy: "synthetic-source-policy-1",
  recency: "validation-recency-1",
  model: "synthetic-impact-model-1",
  rules: "synthetic-rules-1",
  referenceData: "synthetic-reference-data-1",
});

function createCases(category, count, expected, numberOffset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + numberOffset + 1).padStart(2, "0");
    return Object.freeze({
      caseId: `stage-0-${category}-${number}`,
      category,
      synthetic: true,
      references: Object.freeze({
        recommendationSnapshot: `synthetic-snapshot-${category}-${number}`,
        evidenceSignal: `synthetic-signal-${category}-${number}`,
        provenance: `synthetic-provenance-${category}-${number}`,
        observedAt: "2026-08-20T12:00:00.000Z",
        evaluatedAt: "2026-08-20T12:05:00.000Z",
        ...versions,
      }),
      expected: Object.freeze(expected),
    });
  });
}

export const STAGE_0_SYNTHETIC_CASES = Object.freeze([
  ...createCases("relevant_changed", 8, {
    adjudication: "correct",
    recommendationOutcome: "changed",
    materiality: "material",
    reasonCode: "synthetic_material_availability_change",
  }),
  ...createCases(
    "relevant_changed",
    2,
    {
      adjudication: "incorrect",
      recommendationOutcome: "changed",
      materiality: "material",
      reasonCode: "synthetic_expected_material_change_missed",
    },
    8,
  ),
  ...createCases("relevant_unchanged", 10, {
    adjudication: "correct",
    recommendationOutcome: "unchanged",
    materiality: "not_material",
    reasonCode: "synthetic_justified_non_change",
  }),
  ...createCases("irrelevant", 10, {
    adjudication: "correct",
    recommendationOutcome: "unchanged",
    materiality: "not_material",
    reasonCode: "synthetic_not_in_squad_or_watchlist",
  }),
  ...createCases("duplicate", 8, {
    adjudication: "correct",
    recommendationOutcome: "unchanged",
    materiality: "not_material",
    reasonCode: "synthetic_duplicate_no_new_value",
  }),
  ...createCases("stale", 6, {
    adjudication: "correct",
    recommendationOutcome: "unchanged",
    materiality: "not_material",
    reasonCode: "synthetic_stale_with_warning",
  }),
  ...createCases("conflict", 6, {
    adjudication: "withheld",
    recommendationOutcome: "withheld",
    materiality: "withheld",
    reasonCode: "synthetic_unresolved_evidence_conflict",
  }),
]);
