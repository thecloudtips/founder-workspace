# [25] FOS Local Dashboard

> **Status:** Stub — pending specification

## Overview

A localhost web dashboard that visualizes Founder OS data — tasks, CRM health, financial summaries, briefings, goals, and activity timelines. Serves as a single-pane-of-glass for founders to see their business state without opening Notion or Obsidian.

## Topics to Specify

- Tech stack (static HTML + JS served by Node, or lightweight framework)
- Data source: reads from active backend (Notion API or SQLite) via storage-tool
- Dashboard sections / widget layout
- Real-time vs on-demand refresh
- Launch mechanism (slash command `/founder-os:dashboard` starts local server)
- Port selection and conflict handling
- Authentication (local-only, no auth needed?)
- Backend-agnostic: works with both Notion and Obsidian backends
- Mobile-responsive or desktop-only
- Customizable widgets / user-configurable layout
- Integration with existing namespace outputs (briefing, health, goal progress)
