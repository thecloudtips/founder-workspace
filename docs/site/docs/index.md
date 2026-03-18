# Founder OS Documentation

Welcome to the Founder OS documentation. Whether you are evaluating FOS for the first time or looking up a specific command, this is your starting point.

## What is Founder OS?

Founder OS is an AI-powered business automation plugin for Claude Code. It gives founders a single command-line interface to triage email, prepare for meetings, generate reports, manage clients, publish content, and run dozens of other workflows that typically eat hours of your week. 35 command namespaces, 10 agent teams, and a cross-namespace memory engine work together so every command gets smarter the more you use it.

---

## Quick Navigation

### Getting Started

New to Founder OS? Start here.

- [**Getting Started Guide**](../landing/getting-started.md) -- Install in under 5 minutes, run your first commands, and connect your integrations.
- [**Installation & Configuration**](./installation.md) -- Full prerequisites, step-by-step setup, environment variables, and integration wiring.

### Command Reference

Every capability in Founder OS is accessed through slash commands organized into 35 namespaces.

- [**Command Reference**](./commands/index.md) -- Browse all 35 namespaces, understand the four-pillar framework, and see what each command does.

### Agent Teams

When a single-agent pass is not enough, activate a multi-agent team with the `--team` flag.

- [**Agent Teams**](./agents/index.md) -- Learn the 4 team patterns, see all 10 teams, and understand when to use `--team` versus default mode.

### Deep Dives

Architecture and internals for those who want to understand how the system works under the hood.

- [**Memory Engine**](./deep-dives/memory-engine.md) -- Cross-namespace shared memory that learns your preferences and injects relevant context into every command.
- [**Intelligence Engine**](./deep-dives/intelligence-engine.md) -- Adaptive quality scoring, pattern detection, and self-healing that makes commands improve over time.
- [**Evals Framework**](./deep-dives/evals-framework.md) -- Automated quality measurement that scores command outputs against rubrics and catches regressions.
- [**The Dispatcher**](./deep-dives/dispatcher.md) -- How 92 commands run in the background while your main session stays responsive.
- [**Hooks System**](./deep-dives/hooks-system.md) -- Lifecycle hooks that inject context, run preflight checks, and log intelligence without you writing code.

### Extending Founder OS

Add new capabilities, build custom workflows, and discover external tools.

- [**Custom Namespaces**](./extending/custom-namespaces.md) -- Create your own command namespaces with skills and agents.
- [**Workflows**](./extending/workflows.md) -- Chain commands together into automated, schedulable workflows.
- [**Scout**](./extending/scout.md) -- Discover and install external tools with security review and catalog management.

### Installation

- [**Installation & Configuration**](./installation.md) -- Everything you need to go from zero to a fully configured Founder OS environment.

---

## Where to Start

**If you want to try it right now:** Go to the [Getting Started Guide](../landing/getting-started.md). You will be running commands in under 5 minutes.

**If you want to see what it can do first:** Browse the [Command Reference](./commands/index.md) to see all 35 namespaces and 95+ slash commands organized by the four pillars.

**If you are evaluating agent capabilities:** Read the [Agent Teams overview](./agents/index.md) to understand the multi-agent patterns that power the most sophisticated workflows.

**If you are already using FOS and need a reference:** Jump directly to any command page from the [Command Reference table](./commands/index.md) -- every namespace links to its full documentation.
