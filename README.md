# meta-lc-cli

English | [中文](./README_zh.md)

## Positioning
App generator and tooling CLI for App DSL validation and scaffold pipeline outputs.

## Milestone Mapping
- Primary milestone: Phase 6 (+ API Generator task in Phase 2)
- Program board: [GitHub Project #5](https://github.com/orgs/zhongmiao-org/projects/5)

## Scope & Boundaries
- In-scope: module responsibilities mapped to the Meta-Driven SaaS OS mainline.
- Dependency relation: Coordinates generated outputs consumed by kernel, bff, and runtime layers.
- Non-goal: No long-running runtime engine responsibilities.

## MUST Constraints
- DSL is the single source of truth.
- All data/realtime flows must pass through BFF.
- Runtime must not embed business-rule implementation.
- Meta Kernel is the only structural source.

## Collaboration Notes
- Phase 5 (Designer) and materials stay in   [ngx-lowcode](https://github.com/zhongmiao-org/ngx-lowcode).
- [ngx-puzzle](https://github.com/zhongmiao-org/ngx-puzzle) remains an independent base library.

## Quick Start

after cloning this repo:

```bash
npm install
npm run build
```


after adding implementation packages:

```bash
# generate a minimal valid DSL template
npx meta-lc init --out ./app.dsl.json

# validate DSL (returns exit code 1 on failure)
npx meta-lc validate --file ./app.dsl.json

# machine-readable output
npx meta-lc validate --file ./app.dsl.json --json

# human-readable summary + validation result
npx meta-lc explain --file ./app.dsl.json
```


## References
- Unified docs: [lowcode-docs](https://github.com/zhongmiao-org/lowcode-docs)
- Architecture baseline: [Meta-Driven Standard](https://github.com/zhongmiao-org/lowcode-docs/blob/main/meta-driven-standard.md)
