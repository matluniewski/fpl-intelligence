# ADR-0002: Use a local installation context before authentication

Status: Accepted

Date: 2026-08-26

Owners: FPL-73

## Context

The MVP needs to associate a confirmed `TeamState`, a small watchlist, and derived read models with the browser that created them, without introducing authentication or real FPL account access. An unspecified identity boundary could expose one browser's state to another or cause UI work to imply unsupported account recovery.

The owner approved a local, random browser-installation context for this MVP stage on 2026-08-26. This ADR records that approval and deliberately leaves production persistence and retention-duration choices deferred.

## Decision drivers

- Unblock contract-driven MVP read-model and API work without credentials, FPL identifiers, cookies, or account access.
- Prevent cross-context disclosure by default and fail closed when context is missing or invalid.
- Keep the identifier opaque, minimal, and separate from domain and provider identities.
- Make browser reset and the absence of cross-device recovery explicit.
- Avoid selecting authentication, multi-tenancy, analytics, billing, or a public release path.

## Options considered

### Local browser installation context

The browser creates a cryptographically random opaque identifier and stores it in browser local storage. It sends the value only to the application server as an explicit context input. Server-side application ports scope every user-specific read and mutation to that context.

### FPL manager identifier or browser session cookie

These approaches would introduce either an unapproved FPL identifier or cookie/session identity behavior. They conflict with the MVP boundary and do not provide approved account recovery.

### Authentication or third-party identity provider

This can provide durable cross-device identity but is outside the approved MVP scope and needs a separate product, privacy, security, provider, and migration decision.

## Decision

Use a local browser-installation context as the only MVP association mechanism before approved authentication.

- The client creates a high-entropy, opaque installation-context value using the browser cryptographic API and stores it only in local storage. It is not an FPL identifier, account identifier, cookie, or domain identifier.
- An API requiring personalized state receives the value as an explicit request context. The server validates its shape and presence at the trust boundary and returns an unavailable/not-onboarded result when it is missing or invalid; it must never substitute a shared, default, or another context's state.
- Repository and application ports must require the context for every context-owned read, write, deletion, and history query. FPL-74 owns the implementation and automated isolation tests.
- The context value is treated as sensitive correlation data: it is not included in logs, analytics, URLs, fixtures, screenshots, or error messages.
- A user-visible reset deletes the browser value and, once a server-backed store is enabled, requests deletion only for the matching context. Clearing browser storage without reset loses local access; there is no recovery, cross-device sync, or account claim flow.
- FPL-73 does not authorize durable production storage or choose a retention duration. FPL-74 may use only synthetic, non-production development persistence behind this boundary. Enabling durable storage requires an approved retention/deletion policy and its implementing issue.
- A future authentication migration must be separately approved. It must require an explicit user-confirmed migration from the presented local context and must not automatically claim or merge context-owned records.

## Consequences

### Positive

- MVP API and read-model contracts can be implemented without an account system.
- Context ownership is explicit at every server boundary and can be tested deterministically.
- The browser can be reset without collecting credentials or real FPL account data.

### Negative or accepted trade-offs

- Browser-storage clearing, profile changes, or device changes lose access to the local context and its state.
- The value is not authentication and is unsuitable for a public or multi-user deployment.
- No durable production history is enabled until retention and deletion behavior receive separate approval.

## Security, privacy, compliance, and cost impact

- No credentials, cookies, FPL manager IDs, real-account access, external identity provider, analytics, billing, or public release are authorized.
- The opaque context is minimized and excluded from operational content and diagnostic output.
- Screenshot privacy and source-content policies remain unchanged; the context does not authorize new collection or retention.
- This decision introduces no provider, paid service, or variable-cost commitment.

## Verification and rollback

- FPL-74 must add contract and integration tests proving that a missing or invalid context fails closed and that one context cannot read, update, delete, or list another context's records.
- Review all personalized routes and repository methods for an explicit context parameter before enabling them.
- To roll back an MVP implementation, disable the context-owned routes and remove the local browser value. Do not attempt to infer identity or preserve data through an unapproved recovery path.
- A later accepted authentication ADR may supersede this record with an explicit consent, migration, retention, and deletion design.

## References

- Linear FPL-73
- [Architecture](../ARCHITECTURE.md)
- [Product definition](../PRODUCT.md)
- [Screenshot privacy](../SCREENSHOT_PRIVACY.md)
