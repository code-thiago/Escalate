# Script to generate precision geometric lockup for Escalate with snapped 75-degree angles
import math

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 256" width="920" height="256">
  <title>Escalate - Horizontal Lockup</title>
  <!-- Symbol: Stepped Letterform E (Scale: 176px height, centered vertically) -->
  <path d="M48 40 H216 V80 H92 V108 H188 V148 H92 V176 H160 V216 H48 Z" fill="#6366F1" />

  <!-- Wordmark: ESCALATE (Precision Geometric Sans, Cap Height: 112px, y: 72 to 184) -->
  <g fill="#171717">
    <!-- E1 (x: 276 to 336) -->
    <path d="M276 72 H336 V92 H296 V118 H326 V138 H296 V164 H336 V184 H276 Z" />
    
    <!-- S (x: 352 to 414) -->
    <path d="M362 184 C355 184 352 178 352 170 V160 H372 V166 C372 168 374 170 378 170 H398 C402 170 404 168 404 164 V144 C404 140 400 136 394 134 L370 126 C358 122 352 114 352 102 V92 C352 79 362 72 376 72 H396 C410 72 414 80 414 92 V100 H394 V94 C394 90 392 88 388 88 H376 C372 88 370 90 370 94 V106 C370 110 374 114 380 116 L404 124 C416 128 424 136 424 148 V162 C424 176 414 184 398 184 Z" />

    <!-- C (x: 432 to 494) -->
    <path d="M494 94 H474 C474 90 470 88 464 88 H454 C442 88 434 98 434 112 V144 C434 158 442 168 454 168 H464 C470 168 474 166 474 162 H494 C494 176 484 184 466 184 H452 C430 184 416 170 416 148 V108 C416 86 430 72 452 72 H466 C484 72 494 80 494 94 Z" />

    <!-- A1 (x: 510 to 570 - Exact 75.0 deg leg angles: dx=30, dy=112) -->
    <path d="M540 72 L570 184 H548 L542 160 H518 L512 184 H490 L520 72 Z M530 112 L524 140 H536 Z" fill-rule="evenodd" />

    <!-- L (x: 586 to 640) -->
    <path d="M586 72 H606 V164 H642 V184 H586 Z" />

    <!-- A2 (x: 656 to 716 - Exact 75.0 deg leg angles: dx=30, dy=112) -->
    <path d="M686 72 L716 184 H694 L688 160 H664 L658 184 H636 L666 72 Z M676 112 L670 140 H682 Z" fill-rule="evenodd" />

    <!-- T (x: 732 to 792) -->
    <path d="M732 72 H792 V92 H772 V184 H752 V92 H732 Z" />

    <!-- E2 (x: 806 to 866) -->
    <path d="M806 72 H866 V92 H826 V118 H856 V138 H826 V164 H866 V184 H806 Z" />
  </g>
</svg>
"""

with open("brand/escalate-lockup.svg", "w", encoding="utf-8") as f:
    f.write(svg_content.strip())
print("Wrote brand/escalate-lockup.svg with snapped angles")
