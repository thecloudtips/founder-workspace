# Remotion Video Skill (Phase 2) — TTS & Captions

> **Status:** Stub — pending plan writing
> **Depends on:** Phase 1 complete (`[20]-2026-03-19-remotion-skill-phase1.md`)

**Goal:** Add text-to-speech voiceover generation and automatic caption/subtitle support to the video namespace, plus the `social:compose --format=video` bridge.

**Spec:** `docs/superpowers/specs/[20]-2026-03-18-remotion-skill-design.md` (Sections 9, 8.2, 12 Phase 2)

## Deliverables

- `video:voiceover` command — TTS generation (ElevenLabs or OpenAI TTS)
- `video:caption` command — Whisper transcription + SRT output
- 3 new templates: `talking-head`, `story-narrated`, `explainer-voiced`
- 2 new skills: `voiceover`, `captions`
- `social:compose --format=video` bridge to content pipeline
- Caption component with 3 display styles (word, sentence, block)
- Auto-sync: voiceover duration drives video duration

## Dependencies

- TTS provider API key (ElevenLabs or OpenAI)
- `@remotion/install-whisper-cpp` for transcription (~100-400MB model download)
- Phase 1 complete (managed project, templates, render pipeline)

## Topics to Plan

- TTS provider abstraction (support both ElevenLabs and OpenAI behind common interface)
- Voice management (list, preview, set default in brand kit)
- Whisper model selection (tiny/base/small — tradeoff: size vs accuracy)
- Caption component implementation (word-level timing from Whisper)
- social:compose bridge — how to detect `--format=video` and delegate
- Template modifications to accept `captions` and `voiceover` props
- Cost estimation display before TTS generation
