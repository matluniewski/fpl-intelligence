# `@fpl-intelligence/adapters`

Infrastructure adapters for provider and file boundaries. The package maps untrusted external DTOs into provider-independent domain contracts and must not leak transport, source, or SDK types downstream.

FPL-16 introduces the prototype reference-data adapter using a project-authored synthetic fixture. It does not select or call a live football/FPL provider, use FPL credentials, or claim commercial rights for public FPL data.

## Reference-data boundary

`PrototypeReferenceDataAdapter` implements the domain `FootballReferenceDataPort` and also exposes `loadReferenceDataWithContext` for provenance, source-policy, freshness, and warning metadata.

The adapter requires:

- an injected `ReferenceDataSource` returning `unknown`;
- trusted source-policy configuration, kept separate from the untrusted payload;
- a trusted alias registry mapping provider/file external IDs to stable internal season, ruleset, team, player, and fixture identities;
- an explicit clock, usage-event ID factory, timeout, supported source schema, mapping versions, and acquisition purpose; and
- a provider-neutral `UsageRecorder`; there is no silent no-op default.

The current `StaticReferenceDataSource` and `JsonTextReferenceDataSource` support deterministic fixture and file-style inputs. They do not perform network access. A future permitted provider source can implement the same narrow source interface and translate its transport failures into `ReferenceDataSourceError` categories.

## Guarantees

- DTOs are parsed and reconstructed at runtime before mapping.
- External identifiers are resolved through the injected alias registry and never become domain identity by default.
- Unknown or unreviewed commercial-use policy fails closed.
- Normalized output retains provenance references and the mapped provenance record.
- Invalid payloads, timeouts, rate limits, non-success responses, unavailable sources, policy blocks, unsupported queries, and domain-mapping failures remain typed.
- Usage telemetry records a shared reference-data operation without player names, squads, URLs, payloads, or direct user identifiers.
- Telemetry failure creates a visible result warning for a valid load or typed error metadata for a failed load; it never silently reports zero usage.
- `resolvePlayerIdentity` performs deterministic normalized-name matching, optionally narrowed by team and position, and returns ambiguous/not-found states instead of fuzzy guessing.

The fixture exported from `@fpl-intelligence/adapters/testing` is synthetic and is suitable only for tests, local development, and clearly labelled demonstrations.
