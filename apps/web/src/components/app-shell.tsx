import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { NavigationItem } from "@/components/ui/fpl";
import { cn } from "@/lib/utils";

export type DataFreshnessState =
  "synced" | "refreshing" | "stale" | "unavailable";

export interface AppShellNavigationItem {
  readonly href: string;
  readonly label: string;
  readonly active?: boolean;
}

export interface AppShellStatus {
  readonly state: DataFreshnessState;
  readonly label: string;
  readonly detail: string;
}

export interface AppShellProps {
  readonly children: ReactNode;
  readonly navigation: readonly AppShellNavigationItem[];
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly seasonLabel: string;
  readonly gameweekLabel: string;
  readonly statuses: readonly AppShellStatus[];
  readonly onRefresh?: () => void;
}

const statusDot: Record<DataFreshnessState, string> = {
  synced: "bg-[#00c773]",
  refreshing: "bg-[#dca600] animate-pulse",
  stale: "bg-[#dca600]",
  unavailable: "bg-[#d12c42]",
};

export function AppShell({
  children,
  navigation,
  pageTitle,
  pageDescription,
  seasonLabel,
  gameweekLabel,
  statuses,
  onRefresh,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--fpl-color-bg-canvas)] text-[var(--fpl-color-text-primary)] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="bg-[#1f1233] px-4 py-5 text-white lg:min-h-screen lg:py-6">
        <div className="px-2">
          <p className="text-[26px] font-bold leading-none text-[#00c773]">
            FPL
          </p>
          <p className="mt-1 text-[13px] font-semibold tracking-wide">
            INTELLIGENCE
          </p>
          <p className="mt-3 text-xs text-[#b8adcc]">
            Decision support for FPL
          </p>
        </div>

        <nav
          className="mt-7 hidden space-y-2 lg:block"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <NavigationItem
              key={item.href}
              href={item.href}
              active={item.active}
              className={cn(
                "text-white hover:bg-[#291a40] hover:text-white",
                item.active && "bg-[#470d73] text-white",
              )}
            >
              {item.label}
            </NavigationItem>
          ))}
        </nav>

        <details className="mt-5 lg:hidden">
          <summary className="cursor-pointer rounded-md px-2 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#b8adcc]">
            Navigation
          </summary>
          <nav
            className="mt-2 space-y-1"
            aria-label="Mobile primary navigation"
          >
            {navigation.map((item) => (
              <NavigationItem
                key={item.href}
                href={item.href}
                active={item.active}
                className={cn(
                  "text-white hover:bg-[#291a40] hover:text-white",
                  item.active && "bg-[#470d73] text-white",
                )}
              >
                {item.label}
              </NavigationItem>
            ))}
          </nav>
        </details>

        <div className="mt-7 hidden border-t border-white/15 px-2 pt-5 lg:block">
          <p className="text-xs font-medium text-[#b8adcc]">{seasonLabel}</p>
          <p className="mt-2 text-xs text-white">{gameweekLabel}</p>
        </div>
        <div
          className="mt-5 grid gap-2 rounded-xl bg-[#291a40] p-3 text-xs lg:mt-[19rem]"
          aria-label="Data freshness"
        >
          {statuses.map((status) => (
            <p
              key={status.label}
              className="flex items-start gap-2 text-[#d5fbe6]"
            >
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  statusDot[status.state],
                )}
                aria-hidden
              />
              <span>
                <span className="font-medium">{status.label}</span>
                <span className="sr-only">: {status.detail}</span>
              </span>
            </p>
          ))}
        </div>
      </aside>

      <div className="min-w-0 px-4 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-[var(--fpl-color-text-secondary)]">
              {pageDescription}
            </p>
          </div>
          <Button
            type="button"
            onClick={onRefresh}
            className="bg-[#470d73] text-white hover:bg-[#5d168f] focus-visible:ring-[#b8adcc]"
          >
            Refresh data
          </Button>
        </header>
        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}
