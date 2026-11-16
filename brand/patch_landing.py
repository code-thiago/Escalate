with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if 'import { EscalateSymbol } from "@/src/components/brand/EscalateLogo";' not in content:
    content = content.replace(
        'import Link from "next/link";',
        'import Link from "next/link";\nimport { EscalateSymbol } from "@/src/components/brand/EscalateLogo";'
    )

old_hero_icon = """        {/* Brand Hero Icon */}
        <div className="inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center p-4 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500/30 transition-transform duration-300 hover:scale-105">
            <svg
              viewBox="0 0 256 256"
              className="w-full h-full fill-white"
              aria-hidden="true"
            >
              <path d="M44 40 H212 V80 H88 V108 H184 V148 H88 V176 H156 V216 H44 Z" />
            </svg>
          </div>
        </div>"""

new_hero_icon = """        {/* Brand Hero Icon */}
        <div className="inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center p-4 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500/30 transition-transform duration-300 hover:scale-105">
            <EscalateSymbol className="w-full h-full fill-white" />
          </div>
        </div>"""

content = content.replace(old_hero_icon.replace("\r\n", "\n"), new_hero_icon)
content = content.replace(old_hero_icon, new_hero_icon)

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated src/app/page.tsx with EscalateSymbol")
