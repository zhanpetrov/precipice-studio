# PRECIPICE — AI Actor Studio & Workshop #1 Production Hub

**220 Studio · Rob Nilsson & Zhan Petrov · Direct Action Cinéma-Vérité × Google Flow `Veo 3.1`**

- **Live Production Hub (GitHub Pages):** [https://zhanpetrov.github.io/precipice-studio/](https://zhanpetrov.github.io/precipice-studio/)
- **Local Interactive Bridge & Server:** `http://127.0.0.1:8765/` (`python3 scripts/flow_bridge_server.py`)
- **PRECIPICE Control Tower:** [https://zhanpetrov.github.io/precipice/](https://zhanpetrov.github.io/precipice/) (`https://github.com/zhanpetrov/precipice`)
- **YouTube Playlist — Workshop #1:**
  - **Part 1 (50:54 · 21 Chapters):** [PRECIPICE — Acting Workshop #1 | Russ Murphy & Ken Newman | Rob Nilsson (`sokfqTz0Gfk`)](https://youtu.be/sokfqTz0Gfk)
  - **Part 2 (33:08 · 23 Chapters):** [Dinner After the PRECIPICE Acting Workshop | August 31, 2026 (`zRTcxtOp6uQ`)](https://youtu.be/zRTcxtOp6uQ)

---

## What Is Inside This Repository

1. **Dual Workshop #1 & Dinner Interactive Screening Stage (`index.html`, `scripts/app.js`, `data/hub_data.js`)**:
   - Indexes all **44 dramatic beats** across both August 31, 2026 videos (`sokfqTz0Gfk` and `zRTcxtOp6uQ`).
   - Clicking any chapter seeks the embedded YouTube player, displays the 1080p HLG→BT.709 tone-mapped master frame (`assets/workshop_frames/`), explains the Direct Action story discovery, and provides a 1-click **"⚡ Start to Generate This Beat in Google Flow"** button.
2. **Tier-1 Deep AI Actor Profiles (`assets/actors/`, `assets/voices/`, `assets/generated/`)**:
   - **`CHAR-01`: Russ (Rusty) Murphy** — *The Contractor / Anti-MAGA Protagonist / Downstairs Target* (`D001` Likeness Lock). Includes 8 multi-angle stills, 4-panel turnaround quad sheet, Kodak 500T AI still & video preview, 45s clean voice reference stem, psychological coordinate matrix (`NEED / WANT / HATE / LOVE`), and scene presets.
   - **`CHAR-02`: Ken Newman** — *The Bar Magician / Social Catalyst / "The Magic Is a Lie" Con Man*. Includes 8 multi-angle stills (including *The French Drop* close-up hand detail), 4-panel quad sheet, Kodak 500T AI still & video preview, 45s clean voice stem, and scene presets.
   - **`CHAR-03`: Rob Nilsson** — *Director / Self-Reflexive Crew Presence / Direct Action Architect*. Includes 6 multi-angle stills, 4-panel quad sheet, Kodak 500T AI still & video preview, and 45s directing voice stem.
   - **`CHAR-04`: Zhan Petrov** — *Co-Producer / DP / Editor / Self-Reflexive Camera B & AI Architect*. Includes Google Flow `avatar me` ingredient chip (`CHAR_ZHAN_FLOW_AVATAR_ME.png`), multi-angle character sheet (`CHAR_ZHAN_AVATAR_SHEET.jpg`), and `Veo 3.1` clips.
3. **Tier-2 Full 28-Cast PRECIPICE Character Bible**:
   - Complete filterable directory of all **28 cast members** across the 5 spatial/story groups (*Bar Core*, *Bartenders & Patrons*, *Pool Table Rigged Match*, *Silicon Valley Tech*, *7 Women Academics*, *Downstairs ICE Unit*) with `D010` Pre-Scene 6-Angle Photo + 2-Minute Voice intake tracking and individual **"⚡ Start to Generate in Google Flow"** buttons.
   - All personal phone numbers and email addresses are masked per `AGENTS.md` privacy rules.
4. **Live Google Flow Chrome Automation Bridge (`scripts/flow_bridge_server.py`)**:
   - Starts a local HTTP server on `http://127.0.0.1:8765` that connects the website's **"⚡ Start to Generate in Google Flow"** buttons directly to Google Chrome (`https://flow.google.com/project/fc62d0fe-0303-4e5a-8864-0d8a9aee5bbe`) via AppleScript + JavaScript (`ProseMirror` prompt injection + optional Character Ingredient Chip attachment + `Start generation` click + automatic MP4 download).

---

## Quick Start (Local Google Flow Automation)

```bash
python3 scripts/flow_bridge_server.py
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) (or use the live [GitHub Pages site](https://zhanpetrov.github.io/precipice-studio/) while the local bridge is running) and click any **"⚡ Start to Generate in Google Flow"** button.
