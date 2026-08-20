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

## Curated news ingestion

FPL-22 adds central, shared ingestion for the project-authored `news.synthetic.fixture.v1` policy. The adapter runtime-validates its private fixture DTO and maps only normalized `RawNewsItem` values across the boundary. The coordinator enforces the two policy IDs approved by the compliance register, environment controls, expiry, bounded source reads, runtime kill switches, central cache and deduplication, freshness, lifecycle updates, external-processing authorization, and content-free shared telemetry. It always reports `liveCoverage: false`.

`news.first-party.research.v1` remains disabled unless an explicitly enabled restricted policy, approved research/pilot environment, and current per-record rights record are supplied together. No HTTP client, browser automation, scraping, unofficial fallback, or live third-party source is implemented.

See [`docs/NEWS_INGESTION.md`](../../docs/NEWS_INGESTION.md) for the allowlist, policy controls, lifecycle behavior, and deferred decisions.

## Claim extraction

FPL-26 adds `ClaimExtractionPipeline`, a provider-neutral boundary where an external model adapter can return only untrusted output. The pipeline resolves a player deterministically, validates each candidate through the domain contracts, and then produces an unresolved `Claim` with traceable `Evidence`. A multi-player output is processed candidate by candidate; malformed output, model failure, and unresolved identities are quarantined. It neither resolves a `NewsSignal` nor alters projections or recommendations.

- `resolvePlayerIdentity` performs deterministic normalized-name matching, optionally narrowed by team and position, and returns ambiguous/not-found states instead of fuzzy guessing.

The fixture exported from `@fpl-intelligence/adapters/testing` is synthetic and is suitable only for tests, local development, and clearly labelled demonstrations.
