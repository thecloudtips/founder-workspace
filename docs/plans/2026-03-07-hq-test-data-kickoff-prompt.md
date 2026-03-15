# Session Kickoff: Populate [FOS] Founder OS HQ with Test Data

## Context

The [FOS] Founder OS HQ Notion workspace has been deployed with 20 interconnected databases (all prefixed `[FOS]`). All relation columns are wired. The databases are empty.

A comprehensive test data preparation plan exists at:
`docs/plans/2026-03-07-hq-test-data-preparation-plan.md`

Read that plan in full before starting. It defines 224 records across 12 phases with exact values, relation targets, and validation checks.

## Your Task

Populate all 20 [FOS] databases with the mock test data specified in the plan. Follow the phase execution order strictly -- phases 1-6 are sequential (each depends on page IDs from prior phases for relations), phases 7-11 can run in parallel.

## Key Rules

1. **Collect page IDs** -- after creating records in each phase, store the returned page IDs in a mapping (e.g., C1 -> page_id_xxx). You need these to wire relations in later phases.
2. **Use batch creates** -- `notion-create-pages` supports up to 20 pages per call. Batch where possible.
3. **Set Type columns** -- every record in a shared database MUST have its Type property set (e.g., "Action Item", "Invoice", "Daily Briefing"). This is critical for cross-plugin filtering.
4. **Wire relations** -- Company, Contact, Deal, and Goal relations must point to actual page IDs created in earlier phases. Never leave relation fields empty when the plan specifies a link.
5. **Use relative dates** -- the plan uses "-N days" and "+N days" notation. Convert to actual ISO dates relative to today's date at execution time.
6. **Idempotent** -- if re-running, match existing records by title + type before creating duplicates.

## Execution Sequence

```
Phase 1:  [FOS] Companies (8) -> [FOS] Contacts (15) -> [FOS] Deals (6)
          Collect: company_ids{C1-C8}, contact_ids{K1-K15}, deal_ids{D1-D6}

Phase 2:  [FOS] Communications (25)
          Wire: Company + Contact relations using IDs from Phase 1

Phase 3:  [FOS] Tasks (30)
          Wire: Company + Contact relations. Set Type + Source Plugin on every record.

Phase 4:  [FOS] Meetings (12)
          Wire: Company relations. Populate both P03 and P07 fields where specified.

Phase 5:  [FOS] Finance (25)
          Wire: Company relations on client invoices (F1-F14). No relation on F15-F25.

Phase 6:  [FOS] Deliverables (8)
          Wire: Company + Deal relations.

Phase 7-11 (parallel):
  Phase 7:  [FOS] Briefings (8) + [FOS] Reports (5)
  Phase 8:  [FOS] Content (6) + [FOS] Research (4)
  Phase 9:  [FOS] Knowledge Base (8) + [FOS] Prompts (6)
  Phase 10: [FOS] Goals (4) -> [FOS] Milestones (12) -> [FOS] Learnings (10) -> [FOS] Weekly Insights (3)
  Phase 11: [FOS] Workflows (4) + [FOS] Activity Log (5)

Phase 12: Validation pass -- query each database, verify record counts and relation integrity.
```

## Database IDs (from deployment)

Use these data source IDs for the `notion-create-pages` database_id parameter:

| Database | Data Source ID |
|----------|---------------|
| Companies | 2d00c568-27eb-4346-aad5-df4d854cf6f3 |
| Contacts | d549660b-3cf9-414d-a3f7-9f46fc7efa40 |
| Communications | 8769bc7a-a619-4e69-adf7-c348dcc30911 |
| Deliverables | e93b81d5-d6ed-4968-95f9-a5737683c3a5 |
| Deals | 75d525a2-bf98-4f5f-8e8b-91cad1a82321 |
| Tasks | ec072ef0-5d49-46d0-8cf3-7b369b9019cc |
| Meetings | 90322dcf-ed8e-4c31-91e5-8c01ce65e7e2 |
| Finance | 0237da79-ad40-4bfe-b708-f28627f45051 |
| Briefings | a5031cfd-8011-49d8-bf02-16bab4af0299 |
| Knowledge Base | 3570d1b5-7b30-4282-ac9a-3d04d70112b5 |
| Research | 9fdb59b0-d77a-48f1-a036-610f8c17c767 |
| Reports | 064aaa7e-4cac-4e19-9873-8cdcc36caabe |
| Content | f136afbd-39ec-4f0b-86a5-1f01f5b0a75c |
| Prompts | 85a8f429-9b3c-4ccb-bb84-1e5a12809dca |
| Goals | d97f65b7-6938-4db6-b23e-ccf751d85b72 |
| Milestones | a115d300-889d-47e9-a967-1c35bbb24e34 |
| Learnings | fb2db7c8-2f8d-4b45-8939-518565102a52 |
| Weekly Insights | 3a1b4e51-fe27-4029-ba1e-ac1a69194e7c |
| Workflows | a6a63b57-9a9f-4b43-9fb8-34b3bdfbfeec |
| Activity Log | 29f48a1d-ed1d-4885-a7aa-b97b034a6223 |

## Success Criteria

- [ ] All 224 records created across 20 databases
- [ ] All Company/Contact/Deal/Goal relations resolve (no broken links)
- [ ] Type column set on every record in shared databases
- [ ] Date fields use actual ISO dates (not relative placeholders)
- [ ] Health properties on Companies C1-C3, C5 pre-populated
- [ ] Dossier properties on Companies C1, C5 pre-populated
- [ ] At least one record per RAG tier (Green/Yellow/Red) in scored databases
- [ ] Cross-plugin chain data intact (same Thread IDs, Event IDs, Company links across databases)
