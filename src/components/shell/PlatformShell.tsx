"use client";

import React from "react";
import { EscalateTerminalShell } from "./EscalateTerminalShell";

export { EscalateTerminalShell } from "./EscalateTerminalShell";

export function PlatformShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <EscalateTerminalShell>
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <section className="bg-[var(--ds-surface-card)] border border-[var(--ds-border-subtle)] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-[var(--ds-text-primary)] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--ds-text-secondary)] mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
        </section>

        <div className="space-y-6">{children}</div>
      </div>
    </EscalateTerminalShell>
  );
}
