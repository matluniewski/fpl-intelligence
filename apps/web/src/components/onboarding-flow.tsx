"use client";

import { validateImageInput } from "@fpl-intelligence/application";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, Field, SelectField } from "@/components/ui/fpl";
import {
  confirmOnboardingCandidate,
  createOnboardingCandidate,
  illustrativeSelections,
  ONBOARDING_PLAYER_OPTIONS,
  ONBOARDING_SLOTS,
  screenshotCandidateSelections,
  selectionIssue,
} from "@/lib/onboarding-model";

type Step =
  | "upload"
  | "validating"
  | "extracting"
  | "review"
  | "manual"
  | "gameState"
  | "confirm"
  | "confirmed"
  | "failure";

const steps = [
  "Import squad",
  "Review team",
  "Add game state",
  "Confirm",
] as const;

function activeStep(step: Step): number {
  if (step === "review" || step === "manual") return 1;
  if (step === "gameState") return 2;
  if (step === "confirm" || step === "confirmed") return 3;
  return 0;
}

function OnboardingRail({ step }: { readonly step: Step }) {
  const current = activeStep(step);
  return (
    <aside className="bg-[#1f1233] p-6 text-white lg:min-h-[760px] lg:w-[280px]">
      <p className="text-2xl font-bold text-[#00c773]">
        FPL <span className="text-xs text-white">INTELLIGENCE</span>
      </p>
      <p className="mt-5 text-sm text-[#b8adcc]">
        Decision support that explains what changed.
      </p>
      <ol className="mt-10 space-y-3">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`rounded-lg px-4 py-3 text-sm ${current === index ? "bg-[#470d73] font-semibold" : current > index ? "bg-[#26333d]" : "text-[#b8adcc]"}`}
          >
            {current > index ? "✓  " : `${index + 1}  `}
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-12 text-xs text-[#b8adcc] lg:mt-[19rem]">
        No FPL login required
      </p>
    </aside>
  );
}

function SquadEditor({
  selections,
  onChange,
}: {
  readonly selections: readonly string[];
  readonly onChange: (index: number, playerId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ONBOARDING_SLOTS.map((slot, index) => (
        <label className="text-sm" key={slot.label}>
          <span className="font-medium">{slot.label}</span>
          <SelectField
            className="mt-1"
            aria-label={slot.label}
            value={selections[index] ?? ""}
            onChange={(event) => onChange(index, event.target.value)}
          >
            <option value="">Select a player</option>
            {ONBOARDING_PLAYER_OPTIONS.filter(
              (player) => player.position === slot.position,
            ).map((player) => (
              <option key={player.id} value={player.id}>
                {player.label}
              </option>
            ))}
          </SelectField>
        </label>
      ))}
    </div>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>();
  const [failureMessage, setFailureMessage] = useState("");
  const [selections, setSelections] = useState<readonly string[]>(
    ONBOARDING_SLOTS.map(() => ""),
  );
  const [bank, setBank] = useState("0.5");
  const [freeTransfers, setFreeTransfers] = useState("1");
  const [activeChip, setActiveChip] = useState("none");
  const [candidate, setCandidate] = useState<ReturnType<
    typeof createOnboardingCandidate
  > | null>(null);
  const [confirmedTeamStateId, setConfirmedTeamStateId] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  const chooseFile = () => input.current?.click();
  const setPlayer = (index: number, playerId: string) => {
    setSelections((current) =>
      current.map((selection, slotIndex) =>
        slotIndex === index ? playerId : selection,
      ),
    );
  };
  const fillIllustrativeSquad = () => setSelections(illustrativeSelections());

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setStep("validating");
    const validation = validateImageInput(
      new Uint8Array(await file.arrayBuffer()),
    );
    if (!validation.ok) {
      setFailureMessage(validation.message);
      setStep("failure");
    }
  };

  const showScreenshotCandidate = () => {
    setSelections(screenshotCandidateSelections());
    setStep("review");
  };

  const continueWithSquad = () => {
    const issue = selectionIssue(selections);
    if (issue !== null) {
      setFailureMessage(issue);
      return;
    }
    setFailureMessage("");
    setStep("gameState");
  };

  const prepareConfirmation = () => {
    const bankTenths = Math.round(Number(bank) * 10);
    const parsedTransfers = Number(freeTransfers);
    if (
      !Number.isFinite(bankTenths) ||
      bankTenths < 0 ||
      !Number.isInteger(parsedTransfers) ||
      parsedTransfers < 0 ||
      parsedTransfers > 5
    ) {
      setFailureMessage(
        "Enter a valid non-negative bank and between 0 and 5 free transfers.",
      );
      return;
    }
    try {
      const now = new Date().toISOString();
      const nextCandidate = createOnboardingCandidate({
        selections,
        bankTenths,
        freeTransfers: parsedTransfers,
        activeChip: activeChip === "none" ? null : activeChip,
        candidateId: `onboarding-candidate-${crypto.randomUUID()}`,
        enteredAt: now,
      });
      setCandidate(nextCandidate);
      setFailureMessage("");
      setStep("confirm");
    } catch (error) {
      setFailureMessage(
        error instanceof Error ? error.message : "The squad is invalid.",
      );
    }
  };

  const confirmCandidate = () => {
    if (candidate === null) return;
    const result = confirmOnboardingCandidate({
      candidate,
      teamStateId: `onboarding-team-state-${crypto.randomUUID()}`,
      confirmedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setFailureMessage(result.messages.join(" "));
      return;
    }
    setConfirmedTeamStateId(result.teamState.id);
    setFailureMessage("");
    setStep("confirmed");
  };

  const title =
    step === "manual"
      ? "Enter the full squad manually"
      : step === "review"
        ? "Review the provisional squad"
        : step === "gameState"
          ? "Add your game state"
          : step === "confirm"
            ? "Confirm your corrected team"
            : step === "confirmed"
              ? "Your TeamState is confirmed"
              : "Import your FPL squad";

  return (
    <div className="min-h-screen bg-[var(--fpl-color-bg-canvas)] lg:flex">
      <OnboardingRail step={step} />
      <main className="w-full p-6 sm:p-10">
        <p className="text-xs font-bold tracking-wide text-[#470d73]">
          SQUAD SETUP
        </p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--fpl-color-text-secondary)]">
          Illustrative local flow · no automated FPL actions
        </p>

        {failureMessage && step !== "failure" && (
          <Alert tone="danger" className="mt-5 max-w-3xl">
            {failureMessage}
          </Alert>
        )}

        {step === "upload" && (
          <>
            <Card className="mt-8 max-w-3xl py-12 text-center">
              <p className="text-lg font-semibold">
                Drop your squad screenshot here
              </p>
              <p className="mt-2 text-sm text-[var(--fpl-color-text-secondary)]">
                PNG, JPG or WebP · up to 10 MB · show all 15 players where
                possible
              </p>
              <Button
                className="mt-5 bg-[#470d73] text-white hover:bg-[#5d168f]"
                onClick={chooseFile}
              >
                Choose screenshot
              </Button>
              <input
                ref={input}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </Card>
            <div className="my-5 max-w-3xl text-center text-xs font-semibold text-[var(--fpl-color-text-secondary)]">
              OR
            </div>
            <Button variant="outline" onClick={() => setStep("manual")}>
              Enter team manually
            </Button>
            <Alert tone="warning" className="mt-8 max-w-3xl">
              <p className="font-semibold">Your screenshot is temporary</p>
              <p className="mt-1 text-sm text-[var(--fpl-color-text-secondary)]">
                This local flow validates image bytes in the browser and does
                not upload or retain the selected file.
              </p>
            </Alert>
          </>
        )}

        {step === "validating" && (
          <Card className="mt-8 max-w-3xl">
            <div className="flex justify-between">
              <p className="font-semibold">{fileName}</p>
              <Badge>Validated</Badge>
            </div>
            <p className="mt-3 text-sm text-[var(--fpl-color-text-secondary)]">
              Image bytes, format, size, and dimensions passed local checks.
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => setStep("extracting")}>
                Continue extraction
              </Button>
              <Button variant="outline" onClick={() => setStep("manual")}>
                Enter team manually
              </Button>
            </div>
          </Card>
        )}

        {step === "extracting" && (
          <Card className="mt-8 max-w-3xl">
            <p className="font-semibold">Preparing a provisional candidate</p>
            <div className="mt-4 h-2 rounded bg-[#e0e3eb]">
              <div className="h-2 w-2/3 rounded bg-[#470d73]" />
            </div>
            <p className="mt-4 text-sm text-[var(--fpl-color-text-secondary)]">
              The development flow uses illustrative extraction results; no
              vision provider is enabled.
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={showScreenshotCandidate}>Show candidate</Button>
              <Button variant="outline" onClick={() => setStep("manual")}>
                Cancel and use manual entry
              </Button>
            </div>
          </Card>
        )}

        {step === "failure" && (
          <Alert tone="danger" className="mt-8 max-w-3xl">
            <p className="font-semibold">This file cannot be used</p>
            <p className="mt-1 text-sm">{failureMessage}</p>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => setStep("upload")}>
                Choose another file
              </Button>
              <Button variant="outline" onClick={() => setStep("manual")}>
                Enter team manually
              </Button>
            </div>
          </Alert>
        )}

        {(step === "review" || step === "manual") && (
          <>
            <p className="mt-6 max-w-3xl text-sm text-[var(--fpl-color-text-secondary)]">
              {step === "review"
                ? "Resolve every uncertain or missing slot before confirmation."
                : "Manual entry creates the same provisional TeamStateCandidate and requires no screenshot."}
            </p>
            <Card className="mt-4 max-w-3xl">
              <SquadEditor selections={selections} onChange={setPlayer} />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={fillIllustrativeSquad}>
                  Use illustrative complete squad
                </Button>
                <Button onClick={continueWithSquad}>
                  Continue with complete squad
                </Button>
              </div>
            </Card>
          </>
        )}

        {step === "gameState" && (
          <Card className="mt-8 max-w-3xl">
            <p className="font-semibold">Required game state</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                Bank (£m)
                <Field
                  value={bank}
                  min="0"
                  step="0.1"
                  type="number"
                  aria-label="Bank"
                  onChange={(event) => setBank(event.target.value)}
                />
              </label>
              <label className="text-sm">
                Free transfers
                <Field
                  value={freeTransfers}
                  min="0"
                  max="5"
                  type="number"
                  aria-label="Free transfers"
                  onChange={(event) => setFreeTransfers(event.target.value)}
                />
              </label>
              <label className="text-sm">
                Active chip
                <SelectField
                  value={activeChip}
                  aria-label="Active chip"
                  onChange={(event) => setActiveChip(event.target.value)}
                >
                  <option value="none">None</option>
                  <option value="wildcard">Wildcard</option>
                  <option value="free-hit">Free Hit</option>
                  <option value="bench-boost">Bench Boost</option>
                </SelectField>
              </label>
            </div>
            <Button className="mt-5" onClick={prepareConfirmation}>
              Continue to confirmation
            </Button>
          </Card>
        )}

        {step === "confirm" && candidate !== null && (
          <>
            <Card className="mt-8 max-w-3xl">
              <p className="font-semibold">
                Candidate review <Badge className="float-right">Complete</Badge>
              </p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div>
                  <dt className="inline text-[var(--fpl-color-text-secondary)]">
                    Squad:{" "}
                  </dt>
                  <dd className="inline">
                    {candidate.squad.length} players · domain validation ready
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--fpl-color-text-secondary)]">
                    Game state:{" "}
                  </dt>
                  <dd className="inline">
                    £{bank}m bank · {freeTransfers} free transfers ·{" "}
                    {activeChip}
                  </dd>
                </div>
              </dl>
            </Card>
            <Button className="mt-5" onClick={confirmCandidate}>
              Confirm TeamState
            </Button>
          </>
        )}

        {step === "confirmed" && (
          <Alert className="mt-8 max-w-3xl">
            <p className="font-semibold">TeamState confirmed</p>
            <p className="mt-2 text-sm">
              Explicit domain confirmation produced {confirmedTeamStateId}. The
              development session keeps it in memory only and never alters your
              official FPL team.
            </p>
            <Link
              className="mt-5 inline-flex rounded-md bg-[#470d73] px-4 py-2 text-sm font-medium text-white"
              href="/"
            >
              Open illustrative news workspace
            </Link>
          </Alert>
        )}
      </main>
    </div>
  );
}
