---
name: Newsletter Humanization Rules
description: "Newsletter-specific humanization rules for the humanize-content skill. Covers heading structure preservation, paragraph length targets, section transition handling, and long-form content burstiness."
---

## Heading Structure Preservation

H2 and H3 headings are structural elements of a newsletter, not prose. Never modify heading text during Phase B validation or rewriting. Rewrites apply only to body paragraphs within each section. If a heading reads as AI-generated or uses banned vocabulary, flag it for the user to review rather than rewriting it automatically.

## Paragraph Length Targets

Newsletter sections should land between 150 and 300 words. After Phase B rewrites, verify that each section is within this range. If a section has shrunk below 150 words due to consolidation or sentence removal, adjust by expanding key points or splitting compound sentences into two. If a section has grown beyond 300 words, trim by removing the least-informative sentences or merging closely related ideas.

## Burstiness Target

Moderate burstiness. Newsletters are long-form content — rhythm variation matters for readability, but extreme sentence fragments feel jarring in this format. Target a sentence length standard deviation of greater than 4 words across each section's body paragraphs. This is slightly lower than LinkedIn's target of greater than 5, reflecting the longer-form nature of newsletters where sustained explanation is expected.

## Section Transitions

Transitions between sections should feel natural and thematic. Avoid generic connector phrases such as "Moving on to...", "Next, let's look at...", or "Another important aspect is...". These signal AI authorship and interrupt reading flow.

Prefer thematic bridges: the closing idea of one section should connect organically to the opening idea of the next. If a natural connection exists in the content, surface it. If no connection exists, a clean paragraph break is preferable to a filler transition.

## CTA Preservation

The closing CTA block — typically the last paragraph or final named section of the newsletter — should not be rewritten for burstiness or vocabulary diversity. CTAs have their own rhythm requirements that differ from editorial prose. During Phase B, identify the CTA block and exclude it from sentence length normalization and burstiness rewrites. Apply only banned vocabulary checks to the CTA block.
