# AGENTS.md — Personal Site

Personal portfolio site: a Vue 3 + TypeScript frontend in `frontend/`, a Go backend in
`backend/`, and a blog fed from Hashnode backups in `docs/`.

## Shared conventions

Cross-project decisions, code style, stack choices, testing expectations and workflow live
in the hivemind board. **Read `core/INDEX.md` before coding**, then only the 2-3 core files
it points at for the work in hand.

The board is a private repo. If it is not checked out on this machine yet:

    mkdir -p ~/Documents/code-projects
    git clone git@github.com:Stelele/hivemind.git ~/Documents/code-projects/hivemind

Then either of these updates it — adjust the path if you cloned it elsewhere:

    ~/Documents/code-projects/hivemind/hm pull        # the board CLI
    git -C ~/Documents/code-projects/hivemind pull    # plain git

Board: https://github.com/Stelele/hivemind — every rule has an ADR recording why and what
it costs. Everything below, and anything else here, is specific to this project.

Three that get violated most: **never commit without being asked** (ADR 0001) · **make the
whole change, then run tests once** (ADR 0002) · **check the real docs before
implementing** (ADR 0011).

## Layout

| Path | What |
|---|---|
| `frontend/` | Vue 3 + TypeScript + Vite portfolio and blog. Its own [`frontend/AGENTS.md`](frontend/AGENTS.md) has the build commands and project-specific conventions. |
| `backend/` | Go service (`gorilla/mux`). See `goweb.service`. |
| `docs/` | Hashnode and Medium post backups. |

Start in `frontend/AGENTS.md` or `backend/` for anything project-specific.