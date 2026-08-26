"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, Field } from "@/components/ui/fpl";

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
  if (step === "review") return 1;
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

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const chooseFile = () => input.current?.click();
  const onFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setStep(file.type.startsWith("image/") ? "validating" : "failure");
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
                onChange={(e) => onFile(e.target.files?.[0])}
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
                A deployed import deletes it after extraction and confirmation.
                This prototype does not upload the selected file.
              </p>
            </Alert>
          </>
        )}
        {step === "validating" && (
          <Card className="mt-8 max-w-3xl">
            <div className="flex justify-between">
              <p className="font-semibold">{fileName}</p>
              <Badge>Validating…</Badge>
            </div>
            <p className="mt-3 text-sm text-[var(--fpl-color-text-secondary)]">
              File checks run before any extraction.
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
            <p className="font-semibold">Extracting a provisional candidate</p>
            <div className="mt-4 h-2 rounded bg-[#e0e3eb]">
              <div className="h-2 w-2/3 rounded bg-[#470d73]" />
            </div>
            <p className="mt-4 text-sm text-[var(--fpl-color-text-secondary)]">
              Resolving player identities and checking visible squad details.
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => setStep("review")}>Show candidate</Button>
              <Button variant="outline" onClick={() => setStep("manual")}>
                Cancel and use manual entry
              </Button>
            </div>
          </Card>
        )}
        {step === "failure" && (
          <Alert tone="danger" className="mt-8 max-w-3xl">
            <p className="font-semibold">This file cannot be used</p>
            <p className="mt-1 text-sm">
              Choose a PNG, JPG or WebP screenshot, or use the complete manual
              path.
            </p>
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
        {step === "review" && (
          <>
            <div className="mt-6 flex gap-2">
              <Badge>13 matched</Badge>
              <Badge className="bg-[#fff5d6]">1 uncertain</Badge>
              <Badge className="bg-[#ffe3e5] text-[#9e141f]">1 missing</Badge>
            </div>
            <Card className="mt-4 max-w-3xl space-y-2">
              {[
                ["GK", "Raya", "Matched"],
                ["DEF", "Gabriel?", "Resolve identity"],
                ["DEF", "Not detected", "Missing player"],
                ["MID", "Saka", "Matched"],
              ].map(([position, player, status]) => (
                <div
                  key={player}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>
                    <b className="mr-6 text-xs text-[#470d73]">{position}</b>
                    {player}
                  </span>
                  <Badge
                    className={
                      status === "Missing player"
                        ? "bg-[#ffe3e5] text-[#9e141f]"
                        : status === "Resolve identity"
                          ? "bg-[#fff5d6]"
                          : ""
                    }
                  >
                    {status}
                  </Badge>
                </div>
              ))}
            </Card>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => setStep("gameState")}>
                Resolve issues
              </Button>
              <Button variant="outline" onClick={() => setStep("manual")}>
                Start manual entry
              </Button>
            </div>
          </>
        )}
        {step === "manual" && (
          <>
            <p className="mt-6 max-w-3xl text-sm text-[var(--fpl-color-text-secondary)]">
              This complete fallback creates the same TeamState and never
              requires FPL credentials.
            </p>
            <Card className="mt-4 max-w-3xl space-y-4">
              {[
                ["Goalkeepers", "2 / 2"],
                ["Defenders", "4 / 5"],
                ["Midfielders", "4 / 5"],
                ["Forwards", "1 / 3"],
              ].map(([group, count]) => (
                <div
                  key={group}
                  className="flex justify-between rounded-lg border p-4"
                >
                  <span className="font-semibold">{group}</span>
                  <Badge className={count === "2 / 2" ? "" : "bg-[#fff5d6]"}>
                    {count}
                  </Badge>
                </div>
              ))}
              <Button onClick={() => setStep("gameState")}>
                Complete squad and continue
              </Button>
            </Card>
          </>
        )}
        {step === "gameState" && (
          <Card className="mt-8 max-w-3xl">
            <p className="font-semibold">Required game state</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                Bank
                <Field defaultValue="0.5" aria-label="Bank" />
              </label>
              <label className="text-sm">
                Free transfers
                <Field defaultValue="2" aria-label="Free transfers" />
              </label>
              <label className="text-sm">
                Active chip
                <Field defaultValue="None" aria-label="Active chip" />
              </label>
            </div>
            <Button className="mt-5" onClick={() => setStep("confirm")}>
              Continue to confirmation
            </Button>
          </Card>
        )}
        {step === "confirm" && (
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
                    15 players · valid formation and club limits
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--fpl-color-text-secondary)]">
                    Game state:{" "}
                  </dt>
                  <dd className="inline">
                    £0.5m bank · 2 free transfers · no active chip
                  </dd>
                </div>
              </dl>
            </Card>
            <Button className="mt-5" onClick={() => setStep("confirmed")}>
              Confirm TeamState
            </Button>
          </>
        )}
        {step === "confirmed" && (
          <Alert className="mt-8 max-w-3xl">
            <p className="font-semibold">TeamState confirmed</p>
            <p className="mt-2 text-sm">
              Only this reviewed normalized state is used for later
              recommendations. Confirmation does not alter your official FPL
              team.
            </p>
            <Button className="mt-5" onClick={() => setStep("upload")}>
              Review confirmed team
            </Button>
          </Alert>
        )}
      </main>
    </div>
  );
}
