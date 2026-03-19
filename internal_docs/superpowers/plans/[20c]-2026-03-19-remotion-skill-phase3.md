# Remotion Video Skill (Phase 3) — Cloud & Custom Templates

> **Status:** Stub — pending plan writing
> **Depends on:** Phase 1 complete (`[20]-2026-03-19-remotion-skill-phase1.md`)
> **Independent of:** Phase 2 (TTS/Captions)

**Goal:** Add Remotion Lambda cloud rendering for fast/parallel renders, batch multi-preset output, and custom template creation with Remotion Studio integration.

**Spec:** `docs/superpowers/specs/[20]-2026-03-18-remotion-skill-design.md` (Sections 10, 11, 12 Phase 3)

## Deliverables

- `video:cloud-init` command — Remotion Lambda deployment to AWS
- `video:batch` command — parallel multi-preset rendering
- `video:template-create` command — custom template scaffolding
- Cloud render support with cost estimation
- Batch rendering for platform variants (reel + square + landscape in one command)
- Remotion Studio integration for interactive template editing

## Dependencies

- AWS account with Lambda + S3 permissions
- `@remotion/lambda` package
- Phase 1 complete (managed project, templates, render pipeline)
- Phase 2 NOT required

## Topics to Plan

- Lambda function deployment and region selection
- S3 bucket management for assets and render output
- Cost estimation model (compute time × memory × duration)
- Batch job orchestration (parallel Lambda invocations)
- Template scaffolding from existing base templates
- Remotion Studio launch and hot-reload workflow
- Cloud config persistence (`cloud-config.json`)
- Cleanup of temporary S3 objects after download
