# [21] Landing Page Builder Skill Design

> **Status:** Stub — pending specification

## Overview

Claude Code skill that generates a static landing page from user input, deployable to Railway. Founders describe their product/service and the skill produces a complete, production-ready landing page.

## Topics to Specify

- User input format (guided interview vs free-form brief)
- Page sections (hero, features, testimonials, pricing, CTA, footer)
- Tech stack (HTML/CSS/JS, framework choice, static site generator)
- Design system (typography, color palette, responsive breakpoints)
- Brand kit integration (logo, colors, fonts from `.founderOS/config`)
- Template library (SaaS, agency, consultancy, e-commerce, portfolio)
- Image handling (placeholder, stock API, user-provided)
- Form handling (contact forms, email capture — provider choice)
- SEO defaults (meta tags, OG tags, structured data)
- Railway deployment workflow (Dockerfile, railway.json, CLI deploy)
- Custom domain configuration
- Analytics integration (Plausible, GA4, PostHog)
- A/B testing support
- Iteration workflow (edit section, regenerate, preview)
- Skill command structure (`/founder-os:landing:*`)
