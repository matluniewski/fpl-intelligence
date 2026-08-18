import { describe, expect, it } from "vitest";

import { createProvenanceId, createTeamStateId } from "./identifiers";
import { createFplMoney, createUtcInstant } from "./primitives";
import type { ProvenanceRecord } from "./provenance";
import {
  confirmTeamState,
  missingField,
  resolvedField,
  reviseTeamStateCandidate,
  uncertainField,
  validateTeamStateCandidate,
} from "./team-state";
import type { FieldOrigin } from "./team-state";
import {
  SYNTHETIC_MANUAL_ORIGIN,
  SYNTHETIC_NOW,
  SYNTHETIC_PROVENANCE,
  createSyntheticCandidate,
  createSyntheticValidationContext,
} from "./testing/synthetic-fixtures";

describe("TeamState candidate validation and confirmation", () => {
  it("confirms a legal candidate while preserving field origins", () => {
    const candidate = createSyntheticCandidate();
    const result = confirmTeamState({
      teamStateId: createTeamStateId("confirmed-team-state"),
      candidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:05:00Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.teamState.kind).toBe("confirmed");
    expect(result.teamState.candidateId).toBe(candidate.id);
    expect(result.teamState.squad).toHaveLength(15);
    expect(result.teamState.origins.bank.source.kind).toBe("manual_entry");
    expect(result.teamState.origins.bank.confirmedAt).toBe(
      "2026-08-18T12:05:00.000Z",
    );
  });

  it("keeps missing and uncertain fields provisional", () => {
    const missingBank = reviseTeamStateCandidate(
      createSyntheticCandidate(),
      {
        kind: "set_bank",
        value: missingField("The user has not entered a bank value."),
      },
      createUtcInstant("2026-08-18T12:01:00Z"),
    );
    const uncertainTransfers = reviseTeamStateCandidate(
      missingBank,
      {
        kind: "set_free_transfers",
        value: uncertainField({
          suggestedValue: 1,
          origin: SYNTHETIC_MANUAL_ORIGIN,
          reason: "The value still needs user confirmation.",
        }),
      },
      createUtcInstant("2026-08-18T12:02:00Z"),
    );

    const issues = validateTeamStateCandidate(
      uncertainTransfers,
      createSyntheticValidationContext(),
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["field_missing", "field_uncertain"]),
    );

    const result = confirmTeamState({
      teamStateId: createTeamStateId("must-not-exist"),
      candidate: uncertainTransfers,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:03:00Z"),
    });
    expect(result.ok).toBe(false);
  });

  it("validates normalized player identity rather than trusting candidate fields", () => {
    const candidate = createSyntheticCandidate();
    const firstSlot = candidate.squad[0]!;
    const secondSlot = candidate.squad[1]!;
    const duplicateSlot = {
      ...secondSlot,
      playerId: firstSlot.playerId,
    };
    const revised = reviseTeamStateCandidate(
      candidate,
      { kind: "upsert_squad_slot", slot: duplicateSlot },
      createUtcInstant("2026-08-18T12:01:00Z"),
    );

    const issues = validateTeamStateCandidate(
      revised,
      createSyntheticValidationContext(),
    );
    expect(issues.map((issue) => issue.code)).toContain("duplicate_player");
  });

  it("fails closed when referenced commercial-use rights are unknown", () => {
    const provenanceId = createProvenanceId("unreviewed-import");
    const unreviewedRecord: ProvenanceRecord = {
      ...SYNTHETIC_PROVENANCE,
      provenanceId,
      policyAssessment: {
        ...SYNTHETIC_PROVENANCE.policyAssessment,
        commercialUse: "not_reviewed",
      },
    };
    const externalOrigin: FieldOrigin = {
      kind: "external_import",
      capturedAt: SYNTHETIC_NOW,
      confidence: SYNTHETIC_MANUAL_ORIGIN.confidence,
      provenanceRefs: [provenanceId],
    };
    const candidate = createSyntheticCandidate();
    const revised = reviseTeamStateCandidate(
      candidate,
      {
        kind: "set_bank",
        value: resolvedField(
          candidate.bank.status === "resolved"
            ? candidate.bank.value
            : createFplMoney(0),
          externalOrigin,
        ),
      },
      createUtcInstant("2026-08-18T12:01:00Z"),
    );
    const context = {
      ...createSyntheticValidationContext(),
      provenanceRecords: [SYNTHETIC_PROVENANCE, unreviewedRecord],
    };

    expect(
      validateTeamStateCandidate(revised, context).map((issue) => issue.code),
    ).toContain("commercial_use_blocked");
  });

  it("rejects provenance that can no longer support current state", () => {
    const provenanceId = createProvenanceId("withdrawn-import");
    const withdrawnRecord: ProvenanceRecord = {
      ...SYNTHETIC_PROVENANCE,
      provenanceId,
      lifecycle: {
        ...SYNTHETIC_PROVENANCE.lifecycle,
        state: "withdrawn",
      },
    };
    const externalOrigin: FieldOrigin = {
      kind: "external_import",
      capturedAt: SYNTHETIC_NOW,
      confidence: SYNTHETIC_MANUAL_ORIGIN.confidence,
      provenanceRefs: [provenanceId],
    };
    const revised = reviseTeamStateCandidate(
      createSyntheticCandidate(),
      {
        kind: "set_bank",
        value: resolvedField(createFplMoney(10), externalOrigin),
      },
      createUtcInstant("2026-08-18T12:01:00Z"),
    );
    const context = {
      ...createSyntheticValidationContext(),
      provenanceRecords: [SYNTHETIC_PROVENANCE, withdrawnRecord],
    };

    expect(
      validateTeamStateCandidate(revised, context).map((issue) => issue.code),
    ).toContain("provenance_unusable");
  });

  it("rejects revisions that depend on an implicit machine clock", () => {
    expect(() =>
      reviseTeamStateCandidate(
        createSyntheticCandidate(),
        {
          kind: "set_free_transfers",
          value: resolvedField(2, SYNTHETIC_MANUAL_ORIGIN),
        },
        createUtcInstant("2026-08-18T11:59:00Z"),
      ),
    ).toThrow(RangeError);
  });

  it("does not confirm a candidate before its latest revision", () => {
    const candidate = reviseTeamStateCandidate(
      createSyntheticCandidate(),
      {
        kind: "set_free_transfers",
        value: resolvedField(2, SYNTHETIC_MANUAL_ORIGIN),
      },
      createUtcInstant("2026-08-18T12:02:00Z"),
    );
    const result = confirmTeamState({
      teamStateId: createTeamStateId("invalid-confirmation-time"),
      candidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:01:00Z"),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code)).toContain(
      "confirmation_time_invalid",
    );
  });
});
