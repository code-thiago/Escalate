import Link from "next/link";
import React from "react";

interface EscalateLogoProps {
  variant?: "symbol" | "lockup" | "lockup-adaptive";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  href?: string;
  showText?: boolean;
}

export function EscalateSymbol({ className = "w-8 h-8", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      fill={fill}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Escalate Logo Symbol</title>
      <path d="M44 40 H212 V80 H88 V108 H184 V148 H88 V176 H156 V216 H44 Z" />
    </svg>
  );
}

export default function EscalateLogo({
  variant = "lockup-adaptive",
  size = "md",
  className = "",
  href = "/",
  showText = true,
}: EscalateLogoProps) {
  const sizeMap = {
    sm: { icon: "w-6 h-6 p-1 rounded-md", text: "text-sm", gap: "gap-2" },
    md: { icon: "w-8 h-8 p-1.5 rounded-lg", text: "text-base", gap: "gap-2.5" },
    lg: { icon: "w-10 h-10 p-2 rounded-xl", text: "text-lg", gap: "gap-3" },
    xl: { icon: "w-14 h-14 p-2.5 rounded-2xl", text: "text-2xl", gap: "gap-3.5" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`inline-flex items-center ${currentSize.gap} group select-none ${className}`}>
      {/* Container do Isotipo */}
      <div
        className={`${currentSize.icon} bg-[var(--ds-surface-elevated)] border border-[var(--ds-border-subtle)] flex items-center justify-center group-hover:border-[var(--ds-accent-quant)] transition-colors`}
      >
        <EscalateSymbol className="w-full h-full fill-[var(--ds-accent-quant)]" />
      </div>

      {/* Tipografia Oficial da Marca */}
      {showText && variant !== "symbol" && (
        <span
          className={`${currentSize.text} font-black tracking-wider text-[var(--ds-text-primary)] uppercase`}
        >
          Escalate
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center transition-opacity hover:opacity-95"
        aria-label="Escalate - Início"
      >
        {content}
      </Link>
    );
  }

  return content;
}
