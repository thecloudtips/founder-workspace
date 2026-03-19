# Execute Remotion Video Skill — Phase 1

Use the `superpowers:executing-plans` skill (or `superpowers:subagent-driven-development` if subagents are available) to implement the following plan:

**Plan:** `docs/superpowers/plans/[20]-2026-03-19-remotion-skill-phase1.md`
**Spec:** `docs/superpowers/specs/[20]-2026-03-18-remotion-skill-design.md`

## Context

You are implementing the Remotion video generation skill for Founder OS — a Claude Code plugin. This adds a `video` namespace with 6 commands, 4 skills, and 8 Remotion video templates.

## Reference Files (read before starting)

- `commands/social/post.md` — canonical command pattern (frontmatter, skills loading, phases, observation logging)
- `skills/social/template-engine/SKILL.md` — skill pattern with template selection algorithm
- `_infrastructure/late-skills/late-media/SKILL.md` — media handling pattern
- `_infrastructure/preflight/SKILL.md` — preflight check pattern
- `_infrastructure/memory/context-injection/SKILL.md` — memory injection pattern

## Execution Order

The plan has 5 chunks with 17 tasks. Execute in order:

1. **Chunk 1: Foundation** (Tasks 1-4) — package.json, configs, types, utilities, hooks, shared components
2. **Chunk 2: Templates** (Tasks 5-7) — 8 Remotion compositions + Root.tsx registry
3. **Chunk 3: Skills** (Tasks 8-11) — 4 FOS skill markdown files
4. **Chunk 4: Commands** (Tasks 12-15) — 6 command markdown files + preflight registry
5. **Chunk 5: Integration** (Tasks 16-17) — stock assets + end-to-end verification

## Key Rules

- All Remotion template files go under `_infrastructure/video-studio-template/` (scaffold template)
- All FOS skill files go under `skills/video/` with proper YAML frontmatter (name, description, globs)
- All FOS command files go under `commands/video/` with proper YAML frontmatter (description, argument-hint, allowed-tools, execution-mode, result-format)
- All animations in templates MUST use `useCurrentFrame()` + `interpolate()` — never CSS transitions
- Consult `@remotion/skills` rules in the managed project for Remotion API patterns
- Follow existing FOS command conventions: preflight checks, business context, memory injection, intelligence patterns, observation logging
- Commit after each task per the plan's commit instructions

## Remotion API Reminders

- Videos are React components driven by `useCurrentFrame()` hook
- Use `interpolate(frame, inputRange, outputRange, { extrapolateRight: "clamp" })` for all animation
- Use `spring({ frame, fps, config })` for physics-based motion
- Use `<TransitionSeries>` with `fade()`, `slide()`, `wipe()`, `flip()` for scene transitions
- Use `<Audio>` component for background music (not HTML audio)
- Use `<Img>` component for images (not HTML img)
- Use `<OffthreadVideo>` for video clips
- Use `staticFile()` for referencing files in `public/`
- Use `calculateMetadata` on `<Composition>` for dynamic duration
- Use `<Folder>` to organize compositions in the sidebar

## Success Criteria

After all 5 chunks are complete:
- [ ] `_infrastructure/video-studio-template/` contains a valid Remotion project that type-checks
- [ ] All 8 templates are registered in Root.tsx and render without errors
- [ ] All 4 skills follow FOS skill conventions (frontmatter, globs, content structure)
- [ ] All 6 commands follow FOS command conventions (frontmatter, phases, observation logging)
- [ ] Preflight registry includes `video` namespace with all required/optional checks
- [ ] Stock assets are sourced with license documentation
