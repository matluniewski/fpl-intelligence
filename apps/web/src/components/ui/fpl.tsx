import * as React from "react";

import { cn } from "@/lib/utils";

export function IconButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md text-[var(--fpl-color-text-primary)] outline-none hover:bg-[var(--fpl-color-status-success-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--fpl-color-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 rounded border-[var(--fpl-color-border-default)] text-[var(--fpl-color-action-primary)] accent-[var(--fpl-color-action-primary)] focus-visible:ring-2 focus-visible:ring-[var(--fpl-color-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--fpl-color-border-default)] bg-[var(--fpl-color-bg-surface)] p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "success",
  className,
  ...props
}: React.ComponentProps<"div"> & { tone?: "success" | "warning" | "danger" }) {
  const tones = {
    success: "bg-[var(--fpl-color-status-success-subtle)]",
    warning: "bg-[var(--fpl-color-status-warning-subtle)]",
    danger: "bg-[var(--fpl-color-status-danger-subtle)]",
  };
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-[var(--fpl-color-border-default)] p-4 text-[var(--fpl-color-text-primary)]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-[var(--fpl-color-status-success-subtle)] px-2 py-1 text-xs font-medium text-[var(--fpl-color-status-success)]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-[var(--fpl-color-border-default)] bg-[var(--fpl-color-bg-surface)] px-3 text-sm text-[var(--fpl-color-text-primary)] outline-none placeholder:text-[var(--fpl-color-text-secondary)] focus-visible:border-[var(--fpl-color-focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--fpl-color-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}

const fieldClassName =
  "w-full rounded-md border border-[var(--fpl-color-border-default)] bg-[var(--fpl-color-bg-surface)] px-3 text-sm text-[var(--fpl-color-text-primary)] outline-none focus-visible:border-[var(--fpl-color-focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--fpl-color-focus-ring)]";

export function SelectField({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select className={cn("h-10", fieldClassName, className)} {...props} />
  );
}

export function TextArea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 py-2 placeholder:text-[var(--fpl-color-text-secondary)]",
        fieldClassName,
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "animate-pulse rounded-full bg-[var(--fpl-color-status-success-subtle)]",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[var(--fpl-color-border-default)] bg-[var(--fpl-color-bg-surface)] p-6 text-center",
        className,
      )}
    >
      <h2 className="font-semibold text-[var(--fpl-color-text-primary)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--fpl-color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}

export function Tabs({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 border-b border-[var(--fpl-color-border-default)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Tab({
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium text-[var(--fpl-color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--fpl-color-focus-ring)]",
        active
          ? "border-[var(--fpl-color-action-primary)] text-[var(--fpl-color-action-primary)]"
          : "border-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function NavigationItem({
  active = false,
  className,
  ...props
}: React.ComponentProps<"a"> & { active?: boolean }) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--fpl-color-text-secondary)] hover:bg-[var(--fpl-color-status-success-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--fpl-color-focus-ring)]",
        active &&
          "bg-[var(--fpl-color-status-success-subtle)] text-[var(--fpl-color-action-primary)]",
        className,
      )}
      {...props}
    />
  );
}
