# Vision extraction path research

Status: research baseline; no provider selected

Owning issue: FPL-78

Reviewed: 2026-08-26

## Decision summary

This research does not authorize a provider, account, credentials, spend, production
traffic, or implementation. It defines the evidence and benchmark that a later,
separately approved issue must use.

The recommended evaluation order is:

1. Benchmark browser-local Tesseract.js with self-hosted runtime and language assets.
2. Benchmark synchronous Cloud Vision OCR through its EU endpoint only after the
   account, terms, budget, and external-processing gate is approved.
3. Benchmark self-hosted PaddleOCR if browser-local accuracy is insufficient and an
   isolated compute environment is operationally acceptable.
4. Do not evaluate Vertex AI Gemini until its abuse-monitoring, in-memory caching,
   regional processing, human-review, and deletion posture is resolved in writing.

Manual squad entry remains the complete fallback for every option. A benchmark result
may make an option eligible for a later decision; it must not silently select or enable
that option.

## Fixed project constraints

The following constraints come from
[SCREENSHOT_PRIVACY.md](../SCREENSHOT_PRIVACY.md),
[COST_TELEMETRY.md](../COST_TELEMETRY.md), and the existing application contracts:

- Only synthetic or explicitly redacted benchmark images may be used. Real user or FPL
  account screenshots are prohibited in this evaluation.
- A screenshot, crop, OCR output, embedding, provider payload, and equivalent derivative
  are ephemeral content. They must never enter logs, analytics, fixtures, issues, pull
  requests, backups, model training, or support artifacts.
- The one-hour hard TTL starts when the first accepted image byte enters project control.
  Raw content is deleted immediately after extraction, cancellation, manual fallback, or
  fatal failure. A deletion failure fails closed and is observable without content.
- `VisionTeamStateCandidatePort` receives an `artifactId`, not image bytes. Provider DTOs
  and transport errors remain inside infrastructure.
- Provider output is untrusted. A safe decoder and domain validation must produce a
  visibly provisional `TeamStateCandidate`; only explicit user confirmation creates a
  durable `TeamState`.
- Provenance, source restrictions, timestamps, uncertainty, per-field confidence, and
  algorithm versions survive normalization.
- Usage telemetry is content-free and provider-neutral. Unknown prices are reported as
  unknown, never as zero.
- External processing is blocked when retention, deletion, training/reuse, location,
  subprocessors, security controls, rate limits, quotas, variable cost, or contractual
  authority is unknown.
- No real account action is performed or automated.

## Options compared

| Option             | Processing boundary                     | Disposition                                      | Main benefit                                                              | Primary blocker or risk                                                             |
| ------------------ | --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tesseract.js       | User browser                            | Eligible for isolated evaluation                 | No screenshot disclosure and no variable API cost                         | OCR-only output needs deterministic layout parsing; device variance                 |
| PaddleOCR PP-OCRv5 | Project-controlled isolated service     | Eligible for isolated evaluation                 | Stronger OCR/layout tooling under project-controlled retention            | Compute, image/runtime supply chain, and operations burden                          |
| Cloud Vision OCR   | Google Cloud managed service            | Eligible only after external-processing approval | Mature OCR, synchronous in-memory processing, EU endpoint                 | Account, DPA, subprocessors, quota, spend, and network disclosure                   |
| Vertex AI Gemini   | Google Cloud managed generative service | Needs clarification                              | Multimodal structured output can combine recognition and layout reasoning | Abuse logging, default 24-hour memory cache, model/region controls, non-determinism |
| Manual entry       | User input; no image extraction         | Required fallback                                | Complete, deterministic, and provider-independent                         | More user effort                                                                    |

“Eligible for isolated evaluation” is not provider selection. It only means that the
documented option can be tested with the synthetic benchmark after the applicable gates
are approved.

## Option 1: browser-local Tesseract.js

### Evidence and fit

Tesseract.js runs Tesseract OCR in JavaScript/WebAssembly in browsers and Node.js under
Apache-2.0. A browser implementation can keep screenshot pixels on the user's device and
adapt to `VisionTeamStateCandidatePort` by creating an ephemeral browser artifact,
running OCR, passing only the validated candidate across the application boundary, and
destroying all image and OCR derivatives after extraction.

The default installation may fetch worker, core, and trained-language assets from public
CDNs, and trained language data is normally cached in IndexedDB. An acceptable isolated
evaluation must therefore:

- pin and self-host the worker, WebAssembly core, and English trained-data assets;
- record checksums and software/model versions;
- set `cacheMethod: "none"` or prove that any cache contains model assets only and no
  screenshot or OCR-derived content;
- prohibit pixel, recognized-text, bounding-box, and worker-error content in telemetry;
- terminate the worker and release image/object URLs after each attempt; and
- use a deterministic, versioned layout parser for player slots, captaincy, bench order,
  chips, bank, and free transfers.

OCR confidence is not domain confidence. The adapter must lower or omit field confidence
when a name has multiple player matches, a badge is missing, the screenshot is cropped,
or layout geometry is inconsistent. It must not infer a captain or vice-captain merely
from roster position.

### Operational profile

- **Retention and deletion:** no provider-side screenshot retention. Browser memory and
  all derived values are cleared immediately after extraction; the application TTL still
  applies.
- **Training and reuse:** no screenshot training or reuse. Pinned upstream model assets
  are static inputs, not user-derived outputs.
- **Location and subprocessors:** screenshot processing stays in the browser. Asset CDN
  subprocessors are avoided by self-hosting pinned assets.
- **Security:** sandbox in a dedicated worker; enforce MIME/magic-byte, pixel-count,
  dimension, frame-count, decompression, and time limits before OCR.
- **Rate and quota:** no provider quota. Concurrency must be limited per tab/device.
- **Cost assumption:** no per-image provider charge; browser CPU/memory and first-party
  asset delivery remain real but unpriced costs.
- **Expected latency:** unknown for FPL screenshots until measured. The benchmark uses an
  8-second p95 interaction threshold and records supported-device classes.
- **Implementation fit:** direct TypeScript/browser fit, but layout interpretation and
  candidate validation remain project code.

### Primary sources

- [Tesseract.js repository and license](https://github.com/naptha/tesseract.js/)
- [Tesseract.js API and cache controls](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Tesseract.js trained-data caching FAQ](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md)
- [Tesseract.js local asset configuration](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)

## Option 2: self-hosted PaddleOCR PP-OCRv5

### Evidence and fit

PaddleOCR is Apache-2.0 and exposes OCR pipelines with text detection, recognition,
orientation, and optional image correction. PP-OCRv5 publishes mobile and server model
variants. This is materially different from browser-local OCR: screenshot bytes cross a
network boundary but remain inside a project-controlled, isolated processing service.

Published PP-OCRv5 reference measurements are hardware-specific rather than product
SLAs. On the documented Intel Xeon Gold 6271C environment, the mobile base configuration
averaged 1.75 seconds per image and about 2.22 GB peak RAM; enabling all auxiliary
features averaged 3.13 seconds and about 2.75 GB peak RAM. The documented V100 base run
averaged 0.62 seconds and used about 4.19 GB peak VRAM. These figures are planning inputs
only; the FPL benchmark determines actual latency and quality.

An acceptable service must be stateless, accept only a short-lived artifact reference,
hold input and output in memory or an explicitly encrypted ephemeral volume, disable
content-bearing framework logs, and acknowledge deletion before returning success. The
service must map provider/model output into the internal candidate contract before it
reaches application logic.

### Operational profile

- **Retention and deletion:** project controlled. Raw and derived content is deleted
  immediately after extraction and always within the application TTL. Container, crash,
  swap, tracing, and temporary-file behavior must be tested rather than assumed.
- **Training and reuse:** prohibited for benchmark and runtime data. Model artifacts are
  pinned upstream assets only.
- **Location and subprocessors:** no model provider receives screenshots. A later hosting
  provider and region would still require approval and become part of the processor map.
- **Security:** pin container, Python, PaddlePaddle, PaddleOCR, and model digests; scan the
  image decoder and dependency supply chain; isolate egress; enforce CPU, memory, GPU,
  request, and timeout limits.
- **Rate and quota:** project-defined queue and concurrency limits; overload fails to
  manual fallback without retaining input.
- **Cost assumption:** no per-image license fee. Compute, storage, network, patching,
  monitoring, and on-call time are variable or operational costs and remain unknown until
  a hosting profile is approved.
- **Expected latency:** published reference range is roughly 0.62-4.34 seconds depending
  on model and hardware, before project network and parsing overhead. The benchmark uses
  the same 8-second p95 interaction gate.
- **Implementation fit:** requires a separate infrastructure adapter/service and stronger
  operational controls than Tesseract.js.

### Primary sources

- [PaddleOCR repository and license](https://github.com/PaddlePaddle/PaddleOCR)
- [PaddleOCR installation](https://www.paddleocr.ai/main/en/version3.x/installation.html)
- [PP-OCRv5 metrics and reference performance](https://www.paddleocr.ai/main/en/version3.x/algorithm/PP-OCRv5/PP-OCRv5.html)
- [PaddleOCR high-performance local inference](https://www.paddleocr.ai/main/en/version3.x/inference_deployment/local_inference/high_performance_inference.html)

## Option 3: managed Cloud Vision OCR

### Evidence and fit

Cloud Vision supports `TEXT_DETECTION` and `DOCUMENT_TEXT_DETECTION`. Its OCR
documentation lists global, US, and EU endpoints; the EU endpoint processes and stores
OCR data only in the EU. The data-usage FAQ states that online immediate-response
operations process image data in memory and do not persist it to disk, while asynchronous
batch operations temporarily store images. Only synchronous online operations with
inline image bytes are eligible for evaluation; asynchronous operations and Cloud Storage
inputs are out of scope.

Cloud Vision returns OCR text and geometry, not a domain-safe FPL candidate. A deterministic
layout parser, player resolver, safe decoder, confidence policy, and application-level
provenance remain mandatory.

### Operational profile

- **Retention and deletion:** synchronous image data is documented as processed in memory
  and not persisted to disk. Request metadata such as time and size may be logged
  temporarily. The exact account terms and current documentation must be captured at the
  approval date; async APIs are prohibited.
- **Training and reuse:** the service documentation states submitted content is not used
  to train or improve Cloud Vision.
- **Location and subprocessors:** use `eu-vision.googleapis.com` only. Google Cloud's
  current DPA, processor role, processing locations, and subprocessor list require owner
  and applicable legal/compliance review before any external processing.
- **Security:** least-privilege service identity, EU endpoint allowlist, no public buckets,
  inline bytes only, egress controls, content-free audit logs, kill switch, and credential
  rotation.
- **Rate and quota:** project quotas and an application rate limit must be explicit. Quota
  or transport failure goes directly to manual fallback.
- **Cost assumption:** as reviewed, the first 1,000 units per month are free;
  `TEXT_DETECTION` and `DOCUMENT_TEXT_DETECTION` cost USD 1.50 per 1,000 units from 1,001
  through 5,000,000, then USD 0.60 per 1,000. Other Google Cloud resources can add cost.
  Free allowance is not a zero-cost assumption and must not drive provider selection.
- **Expected latency:** no project-relevant latency commitment was found. It must be
  measured under the 8-second p95 benchmark and a 10-second hard request timeout.
- **Implementation fit:** straightforward managed adapter, but introduces external image
  disclosure, credentials, quota, variable cost, and contractual dependencies.

### Primary sources and terms

- [Cloud Vision OCR and regional endpoints](https://docs.cloud.google.com/vision/docs/ocr)
- [Cloud Vision data-usage FAQ](https://docs.cloud.google.com/vision/docs/data-usage)
- [Cloud Vision pricing](https://cloud.google.com/vision/pricing)
- [Google Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum)
- [Google Cloud subprocessors](https://cloud.google.com/terms/subprocessors)
- [Google Cloud security overview](https://cloud.google.com/security/overview)

## Option 4: Vertex AI Gemini multimodal extraction

### Evidence and fit

Gemini on Vertex AI can accept images and produce JSON constrained by a response schema.
This could combine OCR and layout reasoning and map cleanly to a provider-specific DTO
behind `VisionTeamStateCandidatePort`. Schema-constrained output remains untrusted and
non-deterministic: every field still requires safe decoding, player resolution, domain
validation, uncertainty handling, and algorithm/model version provenance.

The current zero-data-retention documentation creates unresolved conditions for this
project. It states that prompts may be logged for abuse monitoring for some customers and
that an exception may be required. It also states that published Gemini models cache
customer inputs, outputs, and derived data in memory by default for up to 24 hours,
although this cache can be disabled at project level. Grounding and session-resumption
features add retention and are unnecessary here. No evaluation may begin until the exact
contract, account scope, GA model, EU location, cache-disabled state, abuse-monitoring
exception, human-review exposure, and deletion semantics are documented and approved.

### Operational profile

- **Retention and deletion:** unresolved. Default 24-hour in-memory caching conflicts
  with the project's immediate-deletion posture unless disabled and independently
  verified. Abuse-monitoring retention must be excluded or approved explicitly.
- **Training and reuse:** documentation states customer data is not used to train or
  fine-tune models without permission. No such permission is authorized.
- **Location and subprocessors:** exact GA model and EU location support must be
  revalidated at evaluation time; current DPA and subprocessor review is mandatory.
- **Security:** all Cloud Vision controls plus prompt-injection-resistant schema handling,
  cache-state verification, disabled grounding/session features, safety/error mapping,
  and model-version pinning.
- **Rate and quota:** explicit application limits and project quotas; no automatic model
  fallback because that changes quality, cost, and data handling.
- **Cost assumption:** token based and model/version dependent. Pricing can change and
  image tokenization must be measured. A concrete per-image ceiling cannot be represented
  honestly before a model, resolution profile, and output-token cap are approved.
- **Expected latency:** unknown for this workload. It must satisfy the 8-second p95 and
  10-second timeout gates without retries that outlive the screenshot TTL.
- **Implementation fit:** potentially simpler semantic extraction, but the highest policy,
  non-determinism, versioning, and cost complexity of the compared options.

### Primary sources and terms

- [Vertex AI structured JSON output sample](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-controlled-generation-response-schema-2)
- [Vertex AI zero-data-retention controls](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention)
- [Vertex AI generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Vertex AI generative AI security controls](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/security-controls)
- [Google Cloud service-specific terms](https://cloud.google.com/terms/service-terms)
- [Google Cloud Advanced AI Safety Addendum](https://cloud.google.com/terms/advanced-ai-safety-addendum)
- [Google Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum)
- [Google Cloud subprocessors](https://cloud.google.com/terms/subprocessors)

## Synthetic benchmark design

The versioned case manifest is
[`vision-extraction-benchmark.csv`](vision-extraction-benchmark.csv). It contains no image
or real account data. A future evaluation issue may generate synthetic PNG/WebP fixtures
from fictional players and values, provided that generation is deterministic and the
fixture manifest records renderer version, dimensions, byte size, SHA-256, and expected
normalized candidate or expected rejection.

### Reference environments

Results must be separated by environment rather than averaged together:

- minimum supported mobile browser/device class;
- current mid-range mobile browser/device class;
- current desktop browser/device class;
- approved self-hosted CPU/GPU profile, when applicable; and
- approved managed-provider EU region, when applicable.

Each quality case is run at least five times per environment after one unscored warm-up.
No retry may hide a failed first attempt. Network, provider, and deletion failures are
reported separately from extraction quality.

### Required quality metrics

- **Player-slot exact accuracy:** correct internal player and slot divided by all visible
  player slots.
- **Complete-candidate exact rate:** all visible candidate fields correct with no invented
  field.
- **Role exact rate:** captain, vice-captain, and bench order each scored independently.
- **Metadata exact rate:** bank, free transfers, gameweek, and chip state when visible.
- **Unsafe confident-field rate:** incorrect fields emitted above the configured
  confirmation confidence threshold.
- **Ambiguity recall:** ambiguous, cropped, conflicting, or unsupported fields correctly
  withheld or marked provisional.
- **Latency:** end-to-end p50, p95, and maximum from accepted byte to validated candidate
  or safe fallback.
- **Lifecycle:** deletion acknowledgment time, TTL enforcement, content-free telemetry,
  and absence of content in logs, traces, crash artifacts, and provider consoles.

### Selection thresholds

An option is ineligible if any mandatory lifecycle or safety gate fails, regardless of
its aggregate score.

| Gate                                                                          | Required threshold                    |
| ----------------------------------------------------------------------------- | ------------------------------------- |
| Player-slot exact accuracy on supported clean layouts                         | >= 98%                                |
| Complete-candidate exact rate on supported clean layouts                      | >= 90%                                |
| Captain, vice-captain, and bench-order exact rate                             | >= 99% each                           |
| Visible bank, free-transfer, gameweek, and chip exact rate                    | >= 95% each                           |
| Unsafe confident-field rate                                                   | <= 0.5% and zero critical role errors |
| Ambiguity recall                                                              | >= 95%                                |
| End-to-end latency                                                            | p95 <= 8 s; hard timeout <= 10 s      |
| Corrupt, polyglot, animated, oversized, or decompression-risk input rejection | 100%                                  |
| Immediate raw/derived deletion after terminal path                            | 100%                                  |
| One-hour hard TTL under interruption or lost client                           | 100%                                  |
| No content in logs, telemetry, crash output, fixtures, or provider console    | 100%                                  |
| Deletion/provider/timeout failure reaches safe manual fallback                | 100%                                  |
| Durable `TeamState` created without explicit confirmation                     | 0 cases                               |

An extraction option must pass all gates on every supported environment. Environment
support cannot be declared after seeing poor results; it must be approved before the
benchmark run. Confidence thresholds, image preprocessing, parser rules, model versions,
and prompt/schema versions are frozen before scoring.

### Required evaluation artifacts

A later evaluation pull request must contain only synthetic and content-free artifacts:

- benchmark manifest and fixture checksums;
- pinned library, model, parser, schema, and renderer versions;
- per-case normalized pass/fail and metrics, without OCR text or image bytes;
- lifecycle and deletion test evidence;
- latency and cost-unit aggregates by environment;
- documented failures, ambiguity, and manual-fallback behavior; and
- a signed-off disposition of eligible, needs clarification, or ineligible.

Benchmark images themselves must remain in an approved synthetic-fixture location. They
must not contain actual player names, team data, account identifiers, or copied FPL visual
assets unless their use is separately approved.

## Decision gates and follow-up work

The following require separate Linear issues and explicit approval where applicable:

1. Approve the exact synthetic fixture design and any use of FPL-like visual assets.
2. Implement the provider-independent benchmark runner and deterministic layout parser.
3. Run the browser-local evaluation with pinned Tesseract.js assets.
4. If needed, approve an isolated PaddleOCR environment and compute budget before running
   it.
5. If needed, approve Google Cloud account authority, DPA/terms review, EU endpoint,
   subprocessors, quota, hard cost ceiling, credentials, kill switch, and deletion tests
   before any Cloud Vision request.
6. Resolve Vertex AI retention questions before creating an evaluation issue for it.
7. Select a provider/path only from frozen benchmark evidence, record any consequential
   decision in an approved ADR, and implement it in a separate issue.

Until those gates are satisfied, screenshot onboarding remains manual-only and no runtime
vision integration is enabled.
