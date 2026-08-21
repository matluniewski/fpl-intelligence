"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type {
  NewsScreenState,
  PersonalizedNewsItem,
  PersonalizedNewsScreenData,
} from "@/lib/personalized-news-data";
import { stateMessage } from "@/lib/personalized-news-data";

type View = "changes" | "detail" | "unchanged" | "recovery";
type Tone = "green" | "amber" | "red" | "blue";

const recoveryStates: readonly NewsScreenState[] = [
  "loading",
  "empty",
  "stale",
  "partial",
  "quarantined",
];

const tones: Record<Tone, string> = {
  green: "bg-[#05a86b]",
  amber: "bg-[#e0800d]",
  red: "bg-[#cc2e40]",
  blue: "bg-[#265ca8]",
};

export function PersonalizedNewsScreen({
  data,
}: {
  readonly data: PersonalizedNewsScreenData;
}) {
  const [view, setView] = useState<View>("changes");
  const [recoveryState, setRecoveryState] =
    useState<NewsScreenState>("loading");
  const [changed, disputed, unchanged] = data.items;

  if (!changed || !disputed || !unchanged) return null;

  return (
    <div className="bg-[#f6f7f9] p-4 text-[#1f1433] sm:p-8">
      <div className="mx-auto max-w-[1120px]">
        <nav
          className="mb-4 flex flex-wrap gap-2"
          aria-label="News workflow views"
        >
          <ViewButton
            active={view === "changes"}
            onClick={() => setView("changes")}
          >
            Relevant changes
          </ViewButton>
          <ViewButton
            active={view === "detail"}
            onClick={() => setView("detail")}
          >
            Change detail
          </ViewButton>
          <ViewButton
            active={view === "unchanged"}
            onClick={() => setView("unchanged")}
          >
            Information unchanged
          </ViewButton>
          <ViewButton
            active={view === "recovery"}
            onClick={() => setView("recovery")}
          >
            Recovery states
          </ViewButton>
        </nav>
        {view === "changes" ? (
          <RelevantChanges
            data={data}
            changed={changed}
            disputed={disputed}
            unchanged={unchanged}
            onDetail={() => setView("detail")}
            onUnchanged={() => setView("unchanged")}
          />
        ) : null}
        {view === "detail" ? <ChangeDetail item={changed} /> : null}
        {view === "unchanged" ? (
          <InformationUnchanged item={unchanged} />
        ) : null}
        {view === "recovery" ? (
          <RecoveryStates
            state={recoveryState}
            onStateChange={setRecoveryState}
          />
        ) : null}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  children,
  onClick,
}: {
  readonly active: boolean;
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ScreenHeader({
  eyebrow,
  title,
}: {
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <header className="rounded-t-2xl bg-[#1f1433] px-7 py-3 text-white">
      <p className="text-[11px] font-semibold tracking-wide text-[#abedd1]">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-[23px] font-bold">{title}</h1>
    </header>
  );
}

function Frame({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[#ded9eb] bg-[#f6f7f9] p-[17px] ${className}`}
    >
      {children}
    </section>
  );
}

function Pill({
  children,
  tone = "green",
}: {
  readonly children: ReactNode;
  readonly tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold text-white ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function RelevantChanges({
  data,
  changed,
  disputed,
  unchanged,
  onDetail,
  onUnchanged,
}: {
  readonly data: PersonalizedNewsScreenData;
  readonly changed: PersonalizedNewsItem;
  readonly disputed: PersonalizedNewsItem;
  readonly unchanged: PersonalizedNewsItem;
  readonly onDetail: () => void;
  readonly onUnchanged: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#ded9eb] bg-white">
      <ScreenHeader
        eyebrow="PERSONALIZED SQUAD & WATCHLIST"
        title="What changed for your team"
      />
      <div className="p-7">
        <p className="text-sm text-[#6e6185]">
          {data.items.length} relevant updates since your last review ·
          unrelated football news is not shown
        </p>
        <section className="mt-3 flex flex-col justify-between gap-2 rounded-xl border border-[#bde3cc] bg-[#edfaf2] px-[17px] py-[11px] sm:flex-row">
          <p className="text-[15px] font-semibold">
            1 recommendation changed · 1 needs review · 1 has new information
            only
          </p>
          <p className="text-xs text-[#6e6185]">
            Last evaluation {data.evaluatedAt}
          </p>
        </section>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <UpdateCard
            item={changed}
            label="RECOMMENDATION CHANGED"
            tone="green"
            action="Open what changed"
            onClick={onDetail}
          />
          <UpdateCard
            item={disputed}
            label="REVIEW EVIDENCE"
            tone="amber"
            action="Open evidence"
            onClick={onDetail}
          />
          <UpdateCard
            item={unchanged}
            label="NEW INFORMATION, UNCHANGED"
            tone="green"
            action="See why unchanged"
            onClick={onUnchanged}
          />
          <Frame className="border-[#d1c2f0] bg-[#ede5fa]">
            <h2 className="font-semibold">Relevance order</h2>
            <p className="mt-2 text-[13px] text-[#6e6185]">
              Your squad → explicit watchlist → supported suggested players
            </p>
          </Frame>
        </div>
        <p className="mt-5 text-xs text-[#6e6185]">
          Only decision-relevant updates are surfaced. Illustrative data.
        </p>
      </div>
    </article>
  );
}

function UpdateCard({
  item,
  label,
  tone,
  action,
  onClick,
}: {
  readonly item: PersonalizedNewsItem;
  readonly label: string;
  readonly tone: Tone;
  readonly action: string;
  readonly onClick: () => void;
}) {
  return (
    <div>
      <Frame>
        <Pill tone={tone}>{label}</Pill>
        <h2 className="mt-2 text-lg font-semibold">
          {item.player} {item.before.recommendation} →{" "}
          {item.after.recommendation}
        </h2>
        <p className="mt-1 text-[13px] text-[#6e6185]">
          Expected minutes {item.before.expectedMinutes} →{" "}
          {item.after.expectedMinutes} · {item.after.confidence.toLowerCase()}{" "}
          confidence · {item.summary}
        </p>
      </Frame>
      <button
        type="button"
        className={`mt-2 ml-[17px] text-[13px] font-semibold ${tone === "green" ? "text-[#05a86b]" : "text-[#e0800d]"}`}
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

function ChangeDetail({ item }: { readonly item: PersonalizedNewsItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#ded9eb] bg-white">
      <ScreenHeader
        eyebrow="RECOMMENDATION CHANGE"
        title={`${item.player}: ${item.before.recommendation} → ${item.after.recommendation}`}
      />
      <div className="p-7">
        <p className="text-sm text-[#6e6185]">
          Relevant availability evidence changed the current recommendation.
        </p>
        <div className="mt-3 grid gap-5 md:grid-cols-3">
          <Snapshot label="PREVIOUS" item={item.before} tone="green" />
          <Snapshot label="CURRENT" item={item.after} tone="amber" />
          <Frame className="border-[#edc787] bg-[#fffaf0]">
            <p className="text-[11px] font-semibold text-[#e0800d]">EVIDENCE</p>
            <p className="mt-2 text-[15px] font-semibold">{item.sourceTier}</p>
            <p className="mt-2 text-xs text-[#6e6185]">
              Observed {item.observedAt} · {item.evidence}
            </p>
          </Frame>
        </div>
        <Frame className="mt-5 border-[#d1c2f0] bg-[#ede5fa]">
          <h2 className="text-xs font-semibold">Decision progression</h2>
          <p className="mt-1 text-[13px] font-medium text-[#403354]">
            HOLD no material risk → WAIT uncertainty remains → SELL confirmed
            material absence
          </p>
        </Frame>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Frame>
            <h2 className="font-semibold">Why WAIT</h2>
            <p className="mt-3 text-[13px] text-[#6e6185]">
              Wait for fresher confirmation. Keep the current lineup if no
              confirmation arrives before deadline.
            </p>
            <p className="mt-5 text-xs font-medium text-[#403354]">
              Alternative: retain HOLD with explicit uncertainty.
            </p>
          </Frame>
          <Frame className="border-[#c2d6f2] bg-[#f2f7ff]">
            <p className="text-xs font-semibold text-[#265ca8]">
              MANUAL ACTION BOUNDARY
            </p>
            <h2 className="mt-3 text-base font-semibold">
              No FPL action is taken here.
            </h2>
            <p className="mt-2 text-[13px] text-[#6e6185]">
              Approval in-app and the manual Open FPL handoff are defined in
              FPL-24.
            </p>
            <p className="mt-4 text-xs font-semibold text-[#265ca8]">
              View recommendation history and what changed
            </p>
          </Frame>
        </div>
      </div>
    </article>
  );
}

function Snapshot({
  label,
  item,
  tone,
}: {
  readonly label: string;
  readonly item: PersonalizedNewsItem["before"];
  readonly tone: Tone;
}) {
  return (
    <Frame>
      <Pill tone={tone}>{label}</Pill>
      <h2 className="mt-2 text-lg font-semibold">{item.recommendation}</h2>
      <p className="mt-1 text-[13px] text-[#6e6185]">
        {item.expectedMinutes} expected min · {item.confidence.toLowerCase()}{" "}
        confidence
      </p>
    </Frame>
  );
}

function InformationUnchanged({
  item,
}: {
  readonly item: PersonalizedNewsItem;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#ded9eb] bg-white">
      <ScreenHeader
        eyebrow="NEW INFORMATION • DECISION UNCHANGED"
        title={`${item.player} remains a ${item.after.recommendation}`}
      />
      <div className="p-7">
        <p className="text-sm text-[#6e6185]">
          New evidence is visible even when the recommendation stays the same.
        </p>
        <section className="mt-3 flex flex-col gap-1 rounded-xl border border-[#bde3cc] bg-[#edfaf2] px-[17px] py-3 sm:flex-row sm:items-center sm:gap-6">
          <strong className="text-lg text-[#05a86b]">
            {item.after.recommendation}
          </strong>
          <span className="text-sm font-semibold">
            medium confidence · no action
          </span>
          <span className="text-xs text-[#6e6185]">
            Updated {item.observedAt}
          </span>
        </section>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Frame>
            <Pill>WHAT IS NEW</Pill>
            <h2 className="mt-2 text-lg font-semibold">
              Training signal observed
            </h2>
            <p className="mt-1 text-[13px] text-[#6e6185]">
              {item.sourceTier} · observed {item.observedAt} · no independent
              corroboration yet
            </p>
          </Frame>
          <Frame>
            <Pill>WHY UNCHANGED</Pill>
            <h2 className="mt-2 text-lg font-semibold">
              Below the material decision threshold
            </h2>
            <p className="mt-1 text-[13px] text-[#6e6185]">
              Expected minutes {item.before.expectedMinutes} →{" "}
              {item.after.expectedMinutes} · confidence{" "}
              {item.before.confidence.toLowerCase()} →{" "}
              {item.after.confidence.toLowerCase()}
            </p>
          </Frame>
        </div>
        <Frame className="mt-5 border-[#d1c2f0] bg-[#ede5fa]">
          <h2 className="font-semibold">
            Recommendation history / what changed
          </h2>
          <p className="mt-4 text-sm text-[#403354]">
            09:16 HOLD confirmed · 09:28 training evidence added · no projection
            threshold crossed
          </p>
          <p className="mt-4 text-xs text-[#6e6185]">
            Show source tier, freshness, corroboration and conflict—not
            restricted raw provider content.
          </p>
        </Frame>
      </div>
    </article>
  );
}

function RecoveryStates({
  state,
  onStateChange,
}: {
  readonly state: NewsScreenState;
  readonly onStateChange: (state: NewsScreenState) => void;
}) {
  const details: Record<NewsScreenState, readonly [string, Tone]> = {
    current: ["Current", "green"],
    loading: ["Comparing new evidence", "blue"],
    empty: ["No relevant changes", "green"],
    stale: ["Recommendation needs refresh", "amber"],
    partial: ["Coverage is reduced", "amber"],
    quarantined: ["No new action is safe", "red"],
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-[#ded9eb] bg-white">
      <ScreenHeader
        eyebrow="RECOVERY & UNCERTAINTY STATES"
        title="Honest states when there is no safe decision"
      />
      <div className="p-7">
        <p className="text-sm text-[#6e6185]">
          Never replace uncertainty with a generic news feed or hidden fallback.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {recoveryStates.map((candidate) => (
            <ViewButton
              key={candidate}
              active={state === candidate}
              onClick={() => onStateChange(candidate)}
            >
              {candidate}
            </ViewButton>
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {recoveryStates.slice(0, 3).map((candidate) => (
            <RecoveryCard
              key={candidate}
              state={candidate}
              detail={details[candidate]}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {recoveryStates.slice(3).map((candidate) => (
            <RecoveryCard
              key={candidate}
              state={candidate}
              detail={details[candidate]}
            />
          ))}
        </div>
        <Frame className="mt-5 border-[#c2d6f2] bg-[#f2f7ff]">
          <p className="text-xs font-semibold text-[#265ca8]">
            SOURCE / POLICY BOUNDARY
          </p>
          <p className="mt-3 text-[13px] text-[#6e6185]">
            {stateMessage(state)} If processing is disabled or raw content is
            restricted, explain the limitation and retain provenance—do not use
            an unapproved fallback.
          </p>
        </Frame>
      </div>
    </article>
  );
}

function RecoveryCard({
  state,
  detail,
}: {
  readonly state: NewsScreenState;
  readonly detail: readonly [string, Tone];
}) {
  return (
    <Frame>
      <Pill tone={detail[1]}>
        {state === "partial"
          ? "PARTIAL PROVIDER FAILURE"
          : state === "quarantined"
            ? "CONTRADICTORY EVIDENCE"
            : state.toUpperCase()}
      </Pill>
      <h2 className="mt-2 text-lg font-semibold">{detail[0]}</h2>
      <p className="mt-1 text-[13px] text-[#6e6185]">{stateMessage(state)}</p>
    </Frame>
  );
}
