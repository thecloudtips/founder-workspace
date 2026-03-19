# About NaluForge & Founder OS

## NaluForge Mission

NaluForge exists to give founders superpowers. We build tools that let solo founders and small teams operate with the reach and precision of much larger organizations — without hiring a dozen specialists or stitching together a fragile stack of SaaS subscriptions.

The reality of founding a company is that you wear every hat. You are the CEO, the sales team, the marketing department, the operations manager, and the support desk — all before lunch. NaluForge believes that AI should close that gap, not by replacing the founder's judgment, but by handling the repetitive, structured work that eats hours out of every day. When your morning briefing writes itself, your follow-ups track themselves, and your client health dashboard updates automatically, you get to spend your time on the work that actually moves the needle.

Our flagship product, Founder OS, is a single plugin for Claude Code that puts 33 automation tools at your fingertips — from email triage and meeting prep to CRM sync, invoice processing, and competitive research. Every tool is designed for the way founders actually work: fast, conversational, and deeply connected to the systems you already use.

## Open-Core Philosophy

Founder OS is free to use. The entire plugin is open-source, and we believe the tools that help founders build their businesses should be accessible to everyone, not locked behind enterprise pricing tiers.

More importantly, you own your data. Founder OS stores everything locally on your machine in SQLite databases and plain files. Your Notion workspace serves as your structured command center, but nothing leaves the tools you already control. There is no NaluForge server sitting between you and your information. No telemetry, no analytics, no data harvesting. When you run `/founder-os:inbox:triage` or `/founder-os:client:load`, the work happens on your machine, talks to your accounts, and writes results to your databases.

The plugin is also built to be extended. The Scout system (`/founder-os:scout:find`, `/founder-os:scout:install`) lets you discover and install community-built skills and commands. You can create your own namespaces, build custom workflows with `/founder-os:workflow:create`, and share what you build with other founders. The architecture is intentionally open — 33 namespaces ship out of the box, but the plugin format means anyone can add more.

## Technology Choices

**Why Claude Code.** Founder OS runs inside Claude Code because AI-native tooling should feel like a conversation, not a dashboard. Instead of clicking through menus and filling out forms, you tell Claude what you need — "prep me for my 2pm with Acme Corp" or "triage my inbox and draft replies" — and it happens. Claude Code's plugin system gives Founder OS deep integration: slash commands, background execution, agent teams that work in parallel, and a memory engine that learns your preferences over time. The result is an assistant that gets better the more you use it.

**Why Notion.** Most founders already live in Notion. Rather than asking you to adopt yet another tool, Founder OS meets you where you are. Your CRM, task boards, meeting notes, knowledge base, and reports all live in a single Notion workspace called Founder OS HQ — 22 interconnected databases that serve as your business operating system. Notion provides the structured data layer, the collaboration features for when you bring on teammates, and a visual interface you can browse anytime you want to see the big picture.

**Why SQLite.** The memory engine and local data store use SQLite because it is fast, reliable, and requires zero setup. There is no database server to install, no connection strings to configure, and no cloud service to pay for. Your data lives in a single file on your machine. It starts working the moment you run your first command and stays fast whether you have ten memories or ten thousand. For a founder tool, this matters — one less thing to manage means one more thing you can focus on.

## The Builder Story

Founder OS started the way most useful tools do: someone needed it and it did not exist yet.

The project grew out of the daily grind of running a small business — the kind where you spend the first hour of every morning context-switching between email, calendar, Slack, and a dozen browser tabs just to figure out what needs your attention. The kind where follow-ups fall through the cracks because no system connects your inbox to your task list to your CRM. The kind where writing a proposal means copying client details from three different places and hoping you did not miss anything.

So the builder started automating those workflows, one at a time. Email triage became the first command. Then meeting prep. Then a daily briefing that pulled from Gmail, Calendar, Notion, and Slack all at once. Each namespace solved a specific pain point, and each one was tested in the context of actually running a business — not in a lab. The design philosophy was simple: if it saves a founder 15 minutes a day and works reliably, ship it. If it requires a PhD to configure, redesign it.

Building in public means being honest about what works and what is still rough. Founder OS is opinionated software built by a founder for founders. It reflects real workflows, real constraints, and real trade-offs. The 33 namespaces that exist today are not a product roadmap conceived in a boardroom — they are the accumulated answer to the question "what did I wish I could automate this week?" asked over and over again.

If you are an indie builder, a solo consultant, or a small team founder who feels like you are constantly doing the work about the work instead of the work itself — that is exactly the problem Founder OS was built to solve.

## What's Next

Founder OS is under active development. Here is what is coming next.

**Obsidian Integration.** Not every founder wants to live in Notion, and we respect that. The Obsidian integration will let you choose a local Obsidian vault as your primary or secondary storage backend during onboarding. Command outputs, notes, meeting preps, and knowledge base entries will write directly to your vault with proper frontmatter and wiki-links. You will be able to switch between Notion and Obsidian — or run both in a dual-backend sync mode.

**Remotion Video Skill.** Short-form video is how founders build audiences, but producing even a simple explainer clip takes hours. The Remotion skill will let you generate, edit, and render short-form video content — reels, stories, product demos, testimonials — directly from Claude Code. Describe what you want, point it at your brand assets, and get a rendered video in the format and resolution you need.

**Landing Page Builder.** Describe your product and get a production-ready landing page. The landing page builder will generate complete static sites from a conversational brief — hero section, features, testimonials, pricing, and CTAs included. Pages deploy directly to Railway with custom domain support, analytics integration, and built-in A/B testing. No frontend skills required.

**Meta Ads Campaign Management.** Creating and managing Facebook and Instagram ad campaigns is time-consuming and error-prone for solo founders. This feature will let you launch campaigns, configure audience targeting, set budgets, and monitor performance — all from Claude Code. It connects to your existing content from the newsletter, content ideation, and social media namespaces, so your ad creative is always fresh and on-brand. Safety-first design includes spend limits and kill switches.

**Google Ads Campaign Management.** The same campaign management capabilities as Meta Ads, built for Google's advertising platform. Search, Display, YouTube, and Performance Max campaigns with keyword research, ad copy generation, bidding strategy management, and conversion tracking. Connects to the [landing page builder](./features.md) so your ads and landing pages stay in sync. Performance reporting flows into your Notion HQ for a single view of your marketing spend and results.

---

Want to see what Founder OS can do today? Start with the [Features overview](./features.md) or jump straight to the [Getting Started guide](./getting-started.md).
