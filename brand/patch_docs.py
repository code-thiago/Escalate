with open("README.md", "r", encoding="utf-8") as f:
    readme = f.read()

old_header = """# finance-simulator

Financial calculations for TypeScript. Pure functions, compound arithmetic, zero floating-point drift."""

new_header = """# Escalate — Simulador Financeiro

<p align="center">
  <img src="public/brand/escalate-lockup.svg" alt="Escalate Logo" width="380" />
</p>

Financial calculations for TypeScript. Pure functions, compound arithmetic, zero floating-point drift."""

readme = readme.replace(old_header.replace("\r\n", "\n"), new_header)
readme = readme.replace(old_header, new_header)
readme = readme.replace("**finance-simulator** is a web application", "**Escalate** is a financial intelligence and wealth projection platform")

with open("README.md", "w", encoding="utf-8") as f:
    f.write(readme)

print("Updated README.md with Escalate branding")

with open("package.json", "r", encoding="utf-8") as f:
    pkg = f.read()

pkg = pkg.replace('"name": "finance-simulator"', '"name": "escalate"')

with open("package.json", "w", encoding="utf-8") as f:
    f.write(pkg)

print("Updated package.json name to escalate")
