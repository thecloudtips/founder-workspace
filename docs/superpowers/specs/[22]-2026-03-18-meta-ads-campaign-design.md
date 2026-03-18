# [22] Meta Ads Campaign Management Design

> **Status:** Stub — pending specification

## Overview

Launch and manage Meta (Facebook/Instagram) ad campaigns from Claude Code. Content generation already exists via existing namespaces — this spec covers the campaign management, targeting, budgeting, and reporting layer.

## Topics to Specify

- Meta Marketing API integration (authentication, permissions, app review)
- Campaign structure (campaign → ad set → ad hierarchy)
- Audience targeting (demographics, interests, custom audiences, lookalikes)
- Budget management (daily vs lifetime, bid strategy)
- Ad creative linking (connect to existing content from P24, P08, P33)
- Campaign creation workflow (guided vs automated)
- Ad format support (single image, carousel, video, stories)
- Pixel/Conversions API setup
- A/B testing (creative variants, audience splits)
- Reporting and analytics (spend, reach, CTR, ROAS)
- Campaign optimization recommendations
- Scheduling (launch times, dayparting)
- Compliance checks (ad policy pre-validation)
- Notion HQ integration (campaign tracking database)
- Skill command structure (`/founder-os:meta-ads:*`)
- Kill switch / spend limits for safety
