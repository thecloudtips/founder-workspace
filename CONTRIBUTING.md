# Contributing to Founder OS

Thank you for your interest in contributing to Founder OS! This guide will help you get started.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/thecloudtips/founder-workspace.git
   cd founder-workspace
   ```

2. **Install Claude Code** if you haven't already — Founder OS is a Claude Code plugin.

3. **Install the plugin locally:**

   ```bash
   cd development
   ./install.sh
   ```

4. **Verify the installation:**

   ```bash
   /founder-os:setup:verify
   ```

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/thecloudtips/founder-workspace/issues/new?template=bug_report.yml) issue template
- Include your environment details (OS, Node version, Claude Code version)
- Include steps to reproduce the issue

### Suggesting Features

- Use the [Feature Request](https://github.com/thecloudtips/founder-workspace/issues/new?template=feature_request.yml) issue template
- Describe the problem you're trying to solve
- Explain your proposed solution

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes following the existing code patterns
4. Test your changes
5. Commit with a descriptive message: `git commit -m "feat: add my feature"`
6. Push to your fork: `git push origin feat/my-feature`
7. Open a Pull Request

### PR Requirements

- Clear description of what changed and why
- Reference any related issues
- No breaking changes without discussion first
- Follow existing code style and patterns

## Code Style

- Follow the patterns established in existing commands, skills, and agents
- Commands go in `development/commands/<namespace>/<action>.md`
- Skills go in `development/skills/<namespace>/<skill-name>/SKILL.md`
- Agents go in `development/agents/<namespace>/`

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

- Visit [fos.naluforge.com](https://fos.naluforge.com) for product documentation
- Read the [docs/](docs/) for technical documentation
- Open a [Discussion](https://github.com/thecloudtips/founder-workspace/discussions) for questions
