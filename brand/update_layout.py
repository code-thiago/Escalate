with open('src/app/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """export const metadata: Metadata = {
  title: "Simulador Financeiro",
  description: "Simulador de juros compostos, comparador de investimentos e cotações em tempo real",
};"""

new_block = """export const metadata: Metadata = {
  title: "Escalate — Simulador Financeiro",
  description: "Cálculos de juros compostos com precisão inteira, comparador de renda fixa e projeções patrimoniais em tempo real",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};"""

content = content.replace(old_block.replace("\r\n", "\n"), new_block)
content = content.replace(old_block, new_block)

with open('src/app/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated layout.tsx successfully")
