# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All development runs inside Docker. Use `make` or `docker compose exec` directly:

```bash
make up          # Start container (http://localhost:5173)
make down        # Stop container
make clean       # Stop + delete volumes (forces pnpm reinstall)
make logs        # Follow dev server logs
make build       # Production build
make typecheck   # react-router typegen && tsc
make shell       # sh into running container
make install     # pnpm install inside container
```

First `make up` runs `pnpm install && pnpm dev --host` automatically via the compose command.

## Architecture

### Data Flow

```
code (string state)
  → parseDSL()       → ParseResult { nodes, edges, groups, notes, errors }
  → autoLayout()     → positions assigned, __RANDOM__ colors resolved
  → SVG components   → rendered in <DiagramEditor>
```

`parsed` is a single `useMemo` in `DiagramEditor.tsx` that re-runs on every keystroke. There is no separate position/color state — everything lives in the DSL string.

### Drag-to-Code Writeback

Dragging a node does **not** update a position state. Instead, it regex-replaces the `x=` and `y=` values directly in the DSL code string:

```ts
line.replace(/x=\S+/, `x=${newX}`)
```

This keeps the code editor and canvas always in sync via the single `code` state.

### Auto Layout

`autoLayout()` in `utils/layout.ts` runs Kahn's topological sort to assign left-to-right layers. It only positions nodes where `_needsPosition: true` (i.e., no `x`/`y` in the DSL). The `__RANDOM__` sentinel for `color` is also resolved here.

### Cross-Module Imports in svg-export

`utils/svg-export.ts` imports `getShapePath` from `components/ShapeNode.tsx` and `getEdgePoints` from `components/EdgeLine.tsx`. These shape/geometry functions are exported from the component files for reuse.

## Key Constraints

- **No SSR**: `react-router.config.ts` has `ssr: false`. This is a pure client-side SPA.
- **Inline styles only**: Tailwind is imported in `app.css` but no Tailwind classes are used. All styling is via React inline `style={}` props.
- **pnpm store**: `.pnpm-store/` lives inside the project dir (Docker volume). It is gitignored.
- **esbuild scripts blocked**: pnpm security blocks esbuild's install script, but Vite uses prebuilt binaries so dev and build work fine.

## DSL Syntax

```
node <id> "Label" { shape=rect color=#6366f1 x=100 y=100 w=150 h=60 }
edge <from> -> <to> { label="text" color=#hex style=dashed|solid animate=true }
group <id> "Label" { color=#hex x=0 y=0 w=300 h=200 }
note <id> "text" { x=0 y=0 color=#hex }
style <nodeId> { color=#hex shape=rect border=#hex text=#hex }
// or # for comments
```

Shapes: `rect`, `stadium`, `diamond`, `ellipse`, `circle`, `cylinder`, `hexagon`, `parallelogram`, `trapezoid`
