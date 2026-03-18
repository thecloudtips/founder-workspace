---
name: posting-cadence
description: "Activates when scheduling posts or managing queue. Provides optimal posting times, frequency recommendations, and content calendar management per platform."
globs: ["commands/social/schedule.md", "commands/social/queue.md", "commands/social/ab-test.md"]
---

# Posting Cadence & Queue Management

## Optimal Posting Times

### LinkedIn
- **Best days**: Tuesday-Thursday
- **Best times**: 8-10am and 12-1pm (user's local timezone)
- **Frequency**: 3-5 posts per week
- **Default schedule suggestion**: "weekdays 10:00am"

### X/Twitter
- **Best days**: Weekdays for B2B, all week for B2C
- **Best times**: 12-1pm and 5-6pm weekdays; 9-10am weekends
- **Frequency**: 3-5 posts per day (higher volume expected)
- **Default schedule suggestion**: "weekdays 12:00pm, 5:00pm" (dual slots)

## Queue Management

Queue slots are pre-configured recurring time windows. When a user schedules with `--queue`, the post goes into the next available slot.

### Queue Workflow
1. User sets up time slots via `social:queue add`
2. Posts scheduled with `--queue` fill the next available slot
3. `social:queue list` shows upcoming slots and which are filled

## Content Calendar Awareness

Before scheduling a new post:
1. Check for existing scheduled posts at the same time
2. Warn if posting frequency exceeds platform recommendations
3. Suggest alternative times if conflicts detected

## Scheduling Infrastructure

The `social` namespace supports `--schedule` for recurring posts:
- Natural language: `"weekdays 9:00am"`, `"every friday 3pm"`
- 5-field cron: `"0 9 * * 1-5"`
- `--persistent`: OS-level cron instead of session-scoped
- `--schedule status`: Show current schedule
- `--schedule disable`: Remove schedule

Generates P27 Workflow YAML per `_infrastructure/scheduling/SKILL.md`.
