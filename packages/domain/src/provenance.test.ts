import { describe, expect, it } from "vitest";

import {
  createProviderId,
  createProvenanceId,
  createSourceId,
  createSourcePolicyId,
} from "./identifiers";
import { createUtcInstant, createVersion } from "./primitives";
import { createProvenanceRecord, isCommercialUseBlocked } from "./provenance";
import type { SourcePolicyAssessment } from "./provenance";

describe("provenance", () => {
  it("defaults missing commercial-use review to a blocking state", () => {
    const now = createUtcInstant("2026-08-18T12:00:00Z");
    const record = createProvenanceRecord({
      provenanceId: createProvenanceId("unreviewed-record"),
      dataCategory: "football_fact",
      sourceChain: [
        { sourceId: createSourceId("synthetic-source"), role: "origin" },
      ],
      provider: {
        providerId: createProviderId("synthetic-provider"),
        product: "Synthetic fixture",
        accessPath: "in-memory",
      },
      acquisition: {
        fetchedAt: now,
        environment: "test",
        purpose: "contract test",
      },
      policyAssessment: {
        sourcePolicyId: createSourcePolicyId("unreviewed-policy"),
        policyVersion: createVersion("1"),
      },
      mapping: {
        adapter: "synthetic-adapter",
        adapterVersion: createVersion("1"),
        normalizationVersion: createVersion("1"),
      },
      lifecycle: {
        state: "active",
        evaluatedAt: now,
        ruleVersion: createVersion("1"),
      },
    });

    expect(record.policyAssessment.commercialUse).toBe("not_reviewed");
    expect(isCommercialUseBlocked(record.policyAssessment)).toBe(true);
  });

  it("fails closed for a malformed runtime assessment", () => {
    const malformedAssessment = {
      sourcePolicyId: createSourcePolicyId("malformed-policy"),
      policyVersion: createVersion("1"),
    } as SourcePolicyAssessment;

    expect(isCommercialUseBlocked(malformedAssessment)).toBe(true);
  });
});
