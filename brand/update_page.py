new_page_code = """\"use client\";

import Link from \"next/link\";

export default function LandingPage() {
  return (
    <main className=\"min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden\">
      {/* Decorative subtle background aura */}
      <div 
        className=\"absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10\"
        aria-hidden=\"true\"
      />

      <div className=\"w-full max-w-xl text-center space-y-8\">
        {/* Brand Hero Icon */}
        <div className=\"inline-flex items-center justify-center\">
          <div className=\"w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center p-4 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500/30 transition-transform duration-300 hover:scale-105\">
            <svg
              viewBox=\"0 0 256 256\"
              className=\"w-full h-full fill-white\"
              aria-hidden=\"true\"
            >
              <path d=\"M44 40 H212 V80 H88 V108 H184 V148 H88 V176 H156 V216 H44 Z\" />
            </svg>
          </div>
        </div>

        {/* Brand Tagline Badge */}
        <div>
          <div className=\"inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-xs\">
            <span className=\"w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse\" />
            Escalate • Precisão Aritmética & Crescimento Patrimonial
          </div>
        </div>

        {/* Title & Copy */}
        <div className=\"space-y-3\">
          <h1 className=\"text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground\">
            Escalate
          </h1>
          <p className=\"text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed\">
            Simulador de juros compostos com aritmética de inteiros (zero drift decimal) e comparador fiscal de renda fixa em tempo real.
          </p>
        </div>

        {/* Actions */}
        <div className=\"flex flex-col sm:flex-row items-center justify-center gap-4 pt-2\">
          <Link
            href=\"/app\"
            className=\"w-full sm:w-auto min-w-[150px] px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold tracking-wide shadow-sm hover:shadow transition-all duration-200 text-center\"
          >
            Abrir Simulador
          </Link>

          <Link
            href=\"/app/comparador\"
            className=\"w-full sm:w-auto min-w-[150px] px-6 py-3 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-sm font-semibold tracking-wide shadow-xs transition-all duration-200 text-center\"
          >
            Comparador
          </Link>
        </div>

        {/* Secondary Navigation */}
        <div className=\"flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground\">
          <Link
            href=\"/login\"
            className=\"hover:text-foreground transition-colors hover:underline underline-offset-4\"
          >
            Entrar na conta
          </Link>
          <span>•</span>
          <Link
            href=\"/sobre\"
            className=\"hover:text-foreground transition-colors hover:underline underline-offset-4\"
          >
            Documentação técnica
          </Link>
        </div>
      </div>
    </main>
  );
}
"""

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(new_page_code.strip() + "\n")

print("Updated page.tsx with Escalate branding")
