# Humanizing AI content: a Claude Code skill architecture for naluforge

**The most effective AI humanization isn't about fooling detectors — it's about fixing the specific statistical patterns that make AI text read like AI text.** Research across academic papers, commercial tools, open-source skills, and practitioner experiments reveals that targeting two core metrics simultaneously — perplexity (word-level unpredictability) and burstiness (sentence-length variance) — reduces AI detection rates from **93% to under 19%** when combined with voice injection. A production-ready Claude Code skill already exists as prior art (blader/humanizer, 8.5k GitHub stars), but it lacks multilingual support, content-type differentiation, and n8n integration. This gap represents naluforge's opportunity. The recommended architecture is a 5-stage transformation pipeline with format-specific modules, parameterized voice profiles, and a self-evaluating quality gate — deployable as both a Claude Code `/humanize` skill and an n8n webhook endpoint.

---

## 1. The existing landscape: what's already built and what's missing

The Claude Code skills ecosystem has matured rapidly, and several humanization tools already exist. **blader/humanizer** is the dominant open-source solution with 8.5k stars and 659 forks. It detects and removes 24 AI writing patterns across five categories (content inflation, structural uniformity, vocabulary tells, meta-commentary, hedging) using a two-pass approach: initial rewrite, "obviously AI-generated" audit, then second rewrite. A Chinese-language fork (op7418/Humanizer-zh) validates that the pattern-removal approach works cross-linguistically, though its author notes a critical insight: pattern removal alone produces sterile writing — true humanization requires both *removal* and *vivification*.

Sabrina Ramonov's humanizer prompt is the most widely shared practical template, specifically designed for LinkedIn and social media. Her rules eliminate em dashes (Claude's primary signature), ban ~60 AI-ism words, enforce active voice, and suppress markdown formatting. She integrated this directly into a Claude Code `/post` skill for social media automation. HumanTone.io provides the most detailed Claude-specific pattern analysis, identifying five distinctive Claude fingerprints: em dashes as "standard sentence architecture," reflexive meta-commentary ("I should note that..."), hedging after every assertion, scope inflation (300-word requests becoming 500-word responses), and uniform prose rhythm.

On the commercial side, Undetectable AI (21M+ users) and WriteHuman lead the market but show inconsistent results. Independent testing revealed Undetectable AI still gets flagged as **100% AI by Originality.ai** after humanization, though it drops ZeroGPT scores to 7%. The commercial tool AI Undetect discloses its approach: a 1B-token corpus with reinforcement learning optimization. The key pattern across commercial tools is multi-detector cross-validation — checking output against GPTZero, ZeroGPT, Sapling, and Copyleaks simultaneously.

**Gap analysis for naluforge's skill:**

- No existing skill handles **Polish language** humanization
- No skill differentiates transformation by **content type** (LinkedIn/blog/email)
- No skill integrates **parameterized voice profiles** as input parameters
- No skill connects to **n8n automation pipelines** with batch processing
- The blader/humanizer lacks a quality-gate self-evaluation loop
- No existing solution addresses Polish-specific AI tells (anglicism calques, overly formal grammar, "Witam" misuse)

Official Anthropic infrastructure supports this build well. Skills use a directory structure with SKILL.md (YAML frontmatter + markdown body, target 1,500–2,000 words), plus `references/`, `scripts/`, and `assets/` subdirectories. Progressive disclosure means Claude reads the main file for ~100 tokens during scanning and loads reference files on demand. The official `internal-comms` skill from Anthropic's skills repository demonstrates the exact multi-format pattern needed: checking communication type and loading relevant reference files per format.

---

## 2. How AI detectors actually work — and where they break

Understanding detection mechanics is essential for building an effective humanizer. AI detectors measure two fundamental statistical properties. **Perplexity** quantifies how predictable each word choice is — LLMs select the statistically safest next token at each step, producing text with systematically low perplexity. Human writing scores **20–50** on standard perplexity benchmarks. **Burstiness** measures variance in sentence length and complexity — AI produces uniform sentences averaging 14–22 words with over 70% falling in that range, while human writing mixes 3-word fragments with 30-word complex sentences.

GPTZero uses a 7-component proprietary model combining these metrics with deep learning, internet text search, and ESL debiasing. Originality.ai claims **99% accuracy** with **0.5% false positives** on its flagship model (Lite 1.0.2), though independent benchmarks show **92.3%** in the HATC-2025 evaluation. The discrepancy matters: the FTC settled with Workado in 2025 for falsely claiming 98% accuracy when independent testing showed only 53%.

Detection reliability varies dramatically by context. Text under **500 words** lacks sufficient statistical signal for reliable detection. Paraphrasing reduces accuracy by **15–20%** on average, while adversarial paraphrasing (from the 2025 paper "Adversarial Paraphrasing: A Universal Attack") achieves **87.88% reduction** in true-positive rates. Non-native English speakers face false positive rates up to **70%** (Stanford, Liang et al., 2023), and Black students were falsely accused at twice the rate of white students — a critical ethical dimension.

**Platform-specific detection matters for naluforge's use case.** LinkedIn doesn't run explicit AI detectors, but its algorithm effectively penalizes AI content: AI-generated posts receive **30% reduction in reach** and **55% lower engagement** according to Richard van der Blom's Algorithm Insights Report. Over 50% of long-form LinkedIn posts (100+ words) are now AI-generated, a 189% increase since ChatGPT's launch. Medium explicitly bans AI-generated content from its paid Partner Program since May 2024. Gmail's RETVec system processes 15B+ unwanted messages daily, and 51% of spam is now AI-generated. Email filters increasingly detect AI patterns through 47 novel stylometric features including imperative verb usage, clause density, and pronoun patterns.

Academic research paints a challenging picture for detection's future. Sadasivan et al. argue theoretically that as human and LLM text distributions converge, any classifier must have large Type I or Type II error. The AuthorMist paper (2025) demonstrated that reinforcement learning can train models to evade specific detectors with "striking cross-detector transfer effects." The detection arms race is fundamentally asymmetric — evasion is easier than detection.

---

## 3. The humanization technique stack, ranked by impact

Research across multiple practitioners and testing studies converges on a clear hierarchy of techniques. The combined approach targeting burstiness, perplexity, and voice injection simultaneously achieves **60–85% detection reduction** — far exceeding any single technique alone.

**Sentence-length variation (burstiness) delivers the highest individual impact at 35–55% detection reduction.** The technique is straightforward: mix 3-word fragments ("Like this.") with 25-word complex sentences, use single-line paragraphs followed by 3–4 sentence blocks, and replace AI transitions ("Furthermore," "Moreover") with human connectors ("But here's the thing," "The catch is"). LinkedIn posts should use very high burstiness with generous whitespace. Blog articles need moderate burstiness with varied paragraph lengths. Emails should front-load key points with paragraphs under 3 sentences.

**Unpredictable word choices (perplexity manipulation) contributes 30–50% detection reduction.** This goes beyond simple synonym swapping — vocabulary bans alone reduce detection only **5–15%** according to humanizerai.com testing. Effective perplexity manipulation means replacing the "obvious" word with a valid but unexpected alternative ("The project landed" instead of "The project was successful"), mixing registers within a piece, inserting culturally specific idioms, and breaking parallel grammatical structures.

The **AI vocabulary blacklist** remains essential despite its limited standalone impact. The words have shifted by era: GPT-4 era (2023–mid 2024) produced "delve," "tapestry," "meticulous," "intricate"; GPT-4o era (mid 2024–2025) shifted to "align with," "fostering," "showcasing," "underscore"; GPT-5 era (mid 2025+) favors "emphasizing," "enhance," "highlighting." Claude has its own distinctive tells: em dashes (the primary detection signal), meta-commentary ("I should note that"), reflexive hedging, and scope inflation.

- **Tier 1 bans** (always eliminate): delve, landscape, leverage, tapestry, multifaceted, paramount, foster, facilitate, navigate, embark, elevate, holistic, robust, seamless, cutting-edge, groundbreaking, pivotal, testament, realm, plethora, myriad, meticulous, underscore
- **Tier 2 bans** (replace or minimize): furthermore/moreover/additionally, "in today's rapidly evolving world," "it's worth noting," "actionable insights," "paradigm shift," "best practices," "stakeholders," "unlock the potential"
- **Structural patterns to break**: "It's not about X, it's about Y" constructions, lists that always have exactly 3 or 5 items, every paragraph starting with a topic sentence, "Let's dive in" openers, "In conclusion" closings

**Voice and personality injection provides 30–50% reduction** and is where humanization becomes genuine quality improvement rather than mere evasion. The most advanced approach found is the "Voice DNA" system by Daria Cupareanu, who tested "every humanizing prompt out there" and concluded they don't work well in isolation. Her three-skill system combines an Audience Profile (personas with conversion triggers), Voice DNA (personal writing patterns, rhythm, vocabulary choices, opening/closing habits), and Business Profile. Her critical insight: "Record yourself talking through your answers using voice input. This gives AI raw material of your actual voice, not what you think you sound like when you're 'writing'." This gets first output to **80% quality**, reducing editing time by half.

**Polish language requires its own technique layer.** Polish AI text has distinctive tells: direct English calques ("oferta dedykowana" from "dedicated offer"), overly correct textbook grammar lacking colloquialisms, monotonous rhythm without unexpected pace changes, and repetitive "W tym artykule przyjrzymy się..." openings. Polish business writing conventions differ significantly from English — more hierarchical, more direct criticism, less filler politeness, and the Pan/Pani courtesy form system. The "Witam" greeting implies superiority and should never be generated; "Dzień dobry" is the safe neutral choice. A notable finding: a 2025 University of Maryland/Microsoft study found Polish is the **#1 most effective language for complex AI tasks** at 88% accuracy, beating English (83.9%), suggesting Claude handles Polish transformation well.

---

## 4. Prompt engineering that actually moves the needle

Testing by multiple practitioners reveals that the generation-time vs. post-processing debate is resolved: **combine both**. Use rich context (Voice DNA, audience profiles, style rules, banned words, few-shot examples) at generation time to get quality raw material, then apply targeted post-processing for remaining AI markers.

Anthropic's official guidance for Claude 4.x models offers key insights. Claude 4.5 models are already "more direct and grounded, more conversational, less verbose" by default. The documentation recommends telling Claude what TO DO rather than what NOT to do — "Your response should be composed of smoothly flowing prose paragraphs" outperforms "Do not use markdown." XML format indicators like `<avoid_excessive_markdown_and_bullet_points>` enforce style effectively. Providing context and motivation behind instructions helps Claude 4.x models "better understand your goals."

**Temperature between 0.5 and 0.7 produces the most human-sounding output.** A controlled test by Definition Agency comparing Claude 3.7 Sonnet at temperatures 0, 0.5, and 1.0 found that middle temperature produced "suggestions that didn't just feel methodical; they're more thoughtful and human." Temperature 0 was "crisply segmented but with little risk." Temperature 1.0 showed diminishing returns over 0.5.

The **multi-pass approach definitively outperforms single-pass** for post-processing. Vaibhav Agarwal's production pipeline (tested January 2026 against GPTZero, ZeroGPT, and Quillbot) found that extensive system prompts alone still get flagged. His winning strategy: extract specifically flagged sentences, humanize them individually with a specialized prompt, surgically replace them, track scores, and roll back when humanization accidentally decreases scores. An n8n community template implements this as a 3-agent loop: Critic (analyzes flaws) → Refiner (creates enhanced version) → Evaluator (checks threshold) → repeat up to 5 iterations.

**The most effective prompt patterns found:**

The "Anglo-Saxon over Latinate" rule has high impact — preferring common, concrete words (use, try, help, build) over academic vocabulary (utilize, endeavor, facilitate, construct). Active voice strictly. Contractions always ("I'm," "don't," "it's"). The "second draft" framing works well: "Rewrite this as if it's your second draft — not your first rough attempt, but not perfectly polished either. Fix major issues but leave some sentences that could be tightened further." The "thought evolution" pattern produces natural-feeling reasoning: "Start with one approach, then partway through, use a transition like 'Actually, thinking about it more...' to slightly revise your thinking."

One practitioner discovered a critical technical detail: "Claude loves em-dashes. GPTZero hates them. Every rewrite introduced new — characters that tanked scores." The solution was a deterministic `.replace()` after every humanization call. This validates the HumanLayer blog's principle: "Never send an LLM to do a linter's job" — use scripts for mechanical pattern detection and save LLM tokens for genuine rewriting.

---

## 5. Recommended SKILL.md architecture for naluforge

The skill should use a **hybrid unified-core plus format-specific modules** architecture. The core humanization logic (reducing AI patterns, varying sentence structure, applying voice) is universal; only structural formatting and platform constraints differ per content type.

**Directory structure:**
```
humanize-content/
├── SKILL.md                         # Core pipeline (~400 lines)
├── references/
│   ├── linkedin-rules.md            # LinkedIn constraints, hooks, formatting
│   ├── blog-rules.md                # Blog structure, SEO, transitions
│   ├── email-rules.md               # Email tone, greetings, CTAs
│   ├── polish-language.md           # PL-specific tells, conventions, banned calques
│   ├── banned-vocabulary.md         # Tiered word/phrase blacklist (EN + PL)
│   └── brand-voice-template.md      # Voice DNA parameter documentation
├── scripts/
│   └── validate.py                  # Deterministic checks (em-dashes, banned words,
│                                    #   sentence-length variance, word diversity ratio)
└── assets/
    └── output-schema.json           # JSON I/O format specification
```

**The 5-stage pipeline:**

Stage 1 (Analyze) detects language from diacritics or parameters, identifies AI-tell patterns in input, classifies content type, loads the relevant reference files, and establishes a baseline quality score. Stage 2 (Transform Structure) varies sentence lengths targeting standard deviation above 5 words, breaks parallel constructions, mixes sentence types (declarative, interrogative, fragments), and replaces formulaic transitions. Stage 3 (Apply Voice) loads voice parameters from input JSON, injects natural discourse markers appropriate to language, replaces AI vocabulary with voice-appropriate alternatives, and adds personal/conversational touches. Stage 4 (Format for Platform) applies platform constraints from the relevant reference file — LinkedIn's 3,000-character limit and hook-in-first-two-lines rule, blog H2/H3 structure and 150–300 word paragraph targets, email subject line optimization and appropriate sign-offs. Stage 5 (Quality Gate) runs the validation script and self-evaluation checklist, checking burstiness, vocabulary diversity ratio (target >0.7), absence of banned phrases, voice alignment, platform compliance, and content fidelity. If below threshold, it identifies the weakest dimension, revises, and re-checks with a maximum of 2 iterations.

**Input/output schema for n8n integration:**
```json
{
  "content": "raw AI-generated text",
  "content_type": "linkedin|blog|email",
  "language": "en|pl|auto",
  "voice": {
    "personality": ["direct", "warm", "knowledgeable"],
    "formality": "casual|professional|formal",
    "vocabulary_level": "simple|moderate|technical",
    "industry_jargon": ["AI automation", "n8n", "workflow"],
    "example_writing_sample": "optional text snippet for style matching"
  },
  "target_audience": "SMB decision-makers in tech"
}
```

The n8n workflow follows a Webhook → Parameter Validation → Claude API → Quality Gate → Conditional Retry → Response pattern. For batch processing, Anthropic's `/v1/messages/batches` endpoint handles up to 100,000 items. The n8n `Split In Batches` node processes arrays of content items, and the `Execute Workflow` node pattern enables parallel processing. The SKILL.md instructions double as the system prompt for API calls, keeping the logic in one place.

---

## 6. LinkedIn policies, ethics, and what naluforge must get right

LinkedIn's Developer AI Policy creates binding constraints for naluforge's automation. The policy requires **clear indication** to end users that content is "partly or fully generated by an AI system," a prominent "AI-powered" label, and tools for users to edit content before publishing. **Automated posting of AI-generated content without end user involvement is explicitly prohibited.** The n8n workflow must include a human approval step.

This creates a clear ethical framework for the skill: position it as a **quality improvement tool**, not a detector-evasion tool. The skill humanizes content to make it genuinely better — more engaging, more natural, more effective at reaching the audience — not to misrepresent its origin. The distinction matters commercially too: agencies that promise "undetectable AI content" face reputational risk as platforms tighten enforcement, while agencies that deliver "polished, professional, voice-consistent content" provide durable value.

The ESL bias issue is particularly relevant for naluforge's Polish-language use case. AI detectors flag non-native English patterns at up to **70% false positive rates**. Polish professionals writing in English may already face unfair detection flags. The humanization skill genuinely helps here — not by hiding AI involvement, but by producing English-language content that reads naturally regardless of the author's native language.

---

## Priority implementation roadmap

**Phase 1 (Week 1–2): Core skill with English LinkedIn support.** Build the SKILL.md with the 5-stage pipeline, banned vocabulary reference file, LinkedIn-specific rules, and the validation script for deterministic checks (em-dash count, banned word scan, sentence-length standard deviation). Use blader/humanizer's 24-pattern taxonomy as the starting detection layer. Test against GPTZero and Originality.ai with 20+ sample posts.

**Phase 2 (Week 3): Multi-format expansion.** Add blog-rules.md and email-rules.md reference files. Implement content-type detection and routing. Build the parameterized voice JSON schema. Test cross-format quality with 10+ samples per type.

**Phase 3 (Week 4): Polish language support.** Create polish-language.md with calque detection, convention rules, and Polish banned-vocabulary additions. Test with Polish LinkedIn posts and client emails. Validate against Polish-language AI detection tools.

**Phase 4 (Week 5–6): n8n integration and batch processing.** Build the webhook workflow, batch processing via Anthropic's batch API, human approval step, and response formatting. Create the brand-voice-template.md for client onboarding. Deploy to naluforge's production pipeline.

**Phase 5 (Ongoing): Voice DNA library.** Build reusable voice profiles for recurring clients. Collect writing samples, run Claude's style analysis, and store as reference files. This becomes naluforge's competitive moat — personalized humanization that generic tools cannot match.