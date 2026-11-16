with open("src/app/sobre/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace metadata
content = content.replace(
    'title: "Sobre o Projeto | Project Midas",',
    'title: "Sobre o Projeto | Escalate",'
)
content = content.replace(
    'description: "Conheça a arquitetura, objetivos matemáticos e stack técnica do Project Midas — Simulador Financeiro.",',
    'description: "Conheça a arquitetura, objetivos matemáticos e stack técnica do Escalate — Simulador Financeiro.",'
)

# Replace hero title
content = content.replace(
    'Project Midas — Simulador Financeiro',
    'Escalate — Simulador Financeiro'
)

# Replace description paragraph
content = content.replace(
    'O que o Project Midas demonstra',
    'O que o Escalate demonstra'
)

# Replace footer copyright
content = content.replace(
    'Project Midas &copy;',
    'Escalate &copy;'
)

# Add EscalateLogo import and use in header
if 'import EscalateLogo from "@/src/components/brand/EscalateLogo";' not in content:
    content = content.replace(
        'import Link from "next/link";',
        'import Link from "next/link";\nimport EscalateLogo from "@/src/components/brand/EscalateLogo";'
    )

old_header = """      {/* Cabeçalho Simplificado */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
        >
          <span aria-hidden="true">&larr;</span> Voltar ao início
        </Link>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          Documentação
        </span>
      </header>"""

new_header = """      {/* Cabeçalho Simplificado com Identidade Escalate */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EscalateLogo size="md" href="/" />
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <span aria-hidden="true">&larr;</span> Voltar ao início
          </Link>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          Documentação Técnica
        </span>
      </header>"""

content = content.replace(old_header.replace("\r\n", "\n"), new_header)
content = content.replace(old_header, new_header)

with open("src/app/sobre/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated src/app/sobre/page.tsx with Escalate branding")
