# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | Yes                |
| 1.1.x   | Security fixes only|
| < 1.1   | No                 |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@founderos.dev**.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include:

- Type of issue (e.g., command injection, path traversal, data exposure)
- Full paths of source file(s) related to the issue
- Step-by-step instructions to reproduce the issue
- Impact of the issue and how an attacker might exploit it

## Scope

The following are in scope:

- Command injection through skill/command parameters
- Path traversal in file operations
- Credential or API key exposure
- Unauthorized access to connected services (Notion, Gmail, etc.)

The following are out of scope:

- Issues in Claude Code itself (report to Anthropic)
- Issues in third-party MCP servers
- Social engineering attacks
