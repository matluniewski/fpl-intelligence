export type ProjectionInputIssueCode =
  | "invalid_value"
  | "missing_provenance"
  | "duplicate_identity"
  | "season_mismatch"
  | "stale_input"
  | "future_observation"
  | "weights_invalid"
  | "probabilities_inconsistent";

export interface ProjectionInputIssue {
  readonly code: ProjectionInputIssueCode;
  readonly path: string;
  readonly message: string;
}

export class ProjectionInputError extends Error {
  readonly code = "projection_input_invalid" as const;
  readonly issues: readonly ProjectionInputIssue[];

  constructor(issues: readonly ProjectionInputIssue[]) {
    super("Projection input is invalid.");
    this.name = "ProjectionInputError";
    this.issues = Object.freeze([...issues]);
  }
}
