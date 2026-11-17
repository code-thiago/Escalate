# Script to generate lockup variants (Dark, White, Black)
with open("brand/escalate-lockup.svg", "r", encoding="utf-8") as f:
    master_svg = f.read()

# 1. Dark surface lockup (Brand symbol #6366F1, text #F4F4F5)
dark_svg = master_svg.replace('fill="#171717"', 'fill="#F4F4F5"').replace("Escalate - Horizontal Lockup", "Escalate - Horizontal Lockup (Dark Theme)")
with open("brand/escalate-lockup-dark.svg", "w", encoding="utf-8") as f:
    f.write(dark_svg)

# 2. All-white lockup (for photography or dark containers)
white_svg = master_svg.replace('fill="#6366F1"', 'fill="#FFFFFF"').replace('fill="#171717"', 'fill="#FFFFFF"').replace("Escalate - Horizontal Lockup", "Escalate - Horizontal Lockup (One-Color White)")
with open("brand/escalate-lockup-white.svg", "w", encoding="utf-8") as f:
    f.write(white_svg)

# 3. All-black lockup (for print / monochrome)
black_svg = master_svg.replace('fill="#6366F1"', 'fill="#000000"').replace('fill="#171717"', 'fill="#000000"').replace("Escalate - Horizontal Lockup", "Escalate - Horizontal Lockup (One-Color Black)")
with open("brand/escalate-lockup-black.svg", "w", encoding="utf-8") as f:
    f.write(black_svg)

print("Generated lockup variants: dark, white, black")
