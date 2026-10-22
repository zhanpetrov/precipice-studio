# Instructions for AI agents working in this repo

- **This Mac Studio is the only machine that pushes to `main`.** Other machines pull, or push to their own branch. Never resolve a merge by silently dropping the other side's work; if both sides changed the same files, stop and ask.
- **Actor likeness material stays local.** D010 voice stems (`assets/voices/`) and 4-angle / avatar sheets (`*_QUAD_SHEET.jpg`, `*_AVATAR_SHEET.jpg`) are git-ignored and only served by the local hub (`scripts/flow_bridge_server.py`). Never commit them or reference them in a way that shows on GitHub Pages; `LOCAL_HUB` in `scripts/app.js` gates them.
- **Decisions belong to the Control Tower.** D001, D010 and other decision IDs are defined in `zhanpetrov/precipice` → `data/production.json`. Here, reference them with `dref("D001")` or `<span data-dref="D001">`, which show the live status. Don't restate or change a decision in this repo.
- **One menu item = one view.** Every top-level `<section>` in `index.html` needs a `data-view` (`workshop`, `actors`, `video`, `cast`, `how`).
