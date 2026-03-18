#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── Arg parsing helpers ──────────────────────────────────────────────
const argv = process.argv.slice(2);

function flag(name) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const val = argv[i + 1];
  return val && !val.startsWith("--") ? val : true;
}

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

function jsonFlag(name) {
  const v = flag(name);
  if (v === undefined || v === true) return undefined;
  try { return JSON.parse(v); } catch { errExit(`Invalid JSON for --${name}`, "NOTION_VALIDATION", `Ensure --${name} is valid JSON`); }
}

// ── Output helpers ───────────────────────────────────────────────────
function ok(data) { process.stdout.write(JSON.stringify(data, null, 2) + "\n"); process.exit(0); }
function errExit(error, code, hint) {
  process.stderr.write(JSON.stringify({ error, code, hint }) + "\n");
  process.exit(1);
}

// ── Auth resolution ──────────────────────────────────────────────────
function resolveAuth() {
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    try {
      const env = readFileSync(resolve(dir, ".env"), "utf8");
      const m = env.match(/^NOTION_API_KEY=(.+)$/m);
      if (m) return m[1].trim();
    } catch { /* not found, walk up */ }
    dir = dirname(dir);
  }
  errExit("No Notion API key found", "NOTION_AUTH_MISSING", "Set NOTION_API_KEY in .env or environment");
}

// ── Notion URL → UUID ────────────────────────────────────────────────
function extractId(input) {
  const hex = input.replace(/-/g, "").match(/([0-9a-f]{32})(?:[?#]|$)/i);
  if (hex) {
    const h = hex[1];
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  if (/^[0-9a-f-]{32,36}$/i.test(input)) {
    const bare = input.replace(/-/g, "");
    return `${bare.slice(0,8)}-${bare.slice(8,12)}-${bare.slice(12,16)}-${bare.slice(16,20)}-${bare.slice(20)}`;
  }
  return input;
}

// ── Raw Notion API client (no SDK — avoids v5.9 validation bugs) ─────
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function notionFetch(path, { method = "GET", body } = {}) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${NOTION_API}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || `Notion API error ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ── Retry with backoff (for 429) ─────────────────────────────────────
async function withRetry(fn, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) {
      if (e.status === 429 && i < retries) {
        const wait = e.body?.retry_after ? e.body.retry_after * 1000 : 1000 * Math.pow(2, i);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

// ── Auto-pagination ──────────────────────────────────────────────────
async function paginate(fn) {
  let cursor = undefined;
  const all = [];
  do {
    const res = await fn(cursor);
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return all;
}

// ── Error wrapper ────────────────────────────────────────────────────
async function run(fn) {
  try { await fn(); } catch (e) {
    if (e.status === 401) errExit(e.message || "Unauthorized", "NOTION_AUTH_FAILED", "Check NOTION_API_KEY");
    if (e.status === 404) errExit(e.message || "Not found", "NOTION_NOT_FOUND", "Check sharing permissions");
    if (e.status === 429) errExit(e.message || "Rate limited", "NOTION_RATE_LIMIT", "Too many requests — try again later");
    if (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT" || e.name === "AbortError")
      errExit("Request timed out", "NOTION_TIMEOUT", "Network issue — try again");
    if (e.status === 400) errExit(e.message || "Validation error", "NOTION_VALIDATION", JSON.stringify(e.body) || "Check parameters");
    errExit(e.message || String(e), "NOTION_ERROR", "Unexpected error");
  }
}

// ── Sanitize properties for creation (strip status options/groups) ────
function sanitizePropsForCreate(properties) {
  const cleaned = {};
  for (const [name, config] of Object.entries(properties)) {
    if (config.status) {
      // Notion API rejects status.options and status.groups on creation
      cleaned[name] = { status: {} };
    } else {
      cleaned[name] = config;
    }
  }
  return cleaned;
}

// ── Help text ────────────────────────────────────────────────────────
const HELP = `notion-tool.mjs — Notion CLI for Founder OS (raw API, no SDK)

Usage: node notion-tool.mjs <command> [args] [options]

Commands:
  search <query>                Search pages & databases (--filter page|database)
  query <database-id>           Query a database (--filter json, --sorts json, --page-size N)
  create-page <parent-id>       Create a page (--properties json, --content json)
  update-page <page-id>         Update page properties (--properties json)
  get-page <page-id-or-url>     Retrieve a page
  get-blocks <page-id>          List child blocks (--recursive)
  get-comments <page-id>        List comments on a page
  create-comment <page-id>      Add a comment (--body text)
  create-database <parent-id>   Create a database (--title text, --properties json)
  update-database <database-id> Update database properties (--properties json)
  fetch <notion-url>            Auto-detect & retrieve page/database/block

Flags:
  --diagnostic   Run diagnostics (auth check, DB list, read/write test)
  --help         Show this help text

Environment:
  NOTION_API_KEY   Notion integration token (or set in .env file)
`;

// ── Main ─────────────────────────────────────────────────────────────
const cmd = argv[0];

if (!cmd || hasFlag("help")) { process.stdout.write(HELP); process.exit(0); }

// All commands require auth
const key = resolveAuth();
const positional = argv.filter(a => !a.startsWith("--")).slice(1);

// Diagnostic mode
if (hasFlag("diagnostic")) {
  const report = { auth: null, databases: null, readWriteTest: null, latency: {} };

  await run(async () => {
    let t = Date.now();
    const me = await notionFetch("/users/me");
    report.latency.auth = Date.now() - t;
    report.auth = { ok: true, user: me.name, type: me.type };

    t = Date.now();
    const dbs = await notionFetch("/search", {
      method: "POST",
      body: { filter: { value: "database", property: "object" }, page_size: 50 },
    });
    report.latency.listDatabases = Date.now() - t;
    report.databases = { count: dbs.results.length, names: dbs.results.map(d => d.title?.[0]?.plain_text || "(untitled)") };

    if (dbs.results.length > 0) {
      const dbId = dbs.results[0].id;
      t = Date.now();
      const page = await notionFetch("/pages", {
        method: "POST",
        body: {
          parent: { database_id: dbId },
          properties: { title: { title: [{ text: { content: "[FOS] diagnostic test — safe to delete" } }] } },
        },
      });
      report.latency.createPage = Date.now() - t;

      t = Date.now();
      await notionFetch(`/pages/${page.id}`);
      report.latency.readPage = Date.now() - t;

      t = Date.now();
      await notionFetch(`/pages/${page.id}`, { method: "PATCH", body: { archived: true } });
      report.latency.archivePage = Date.now() - t;
      report.readWriteTest = { ok: true, pageId: page.id };
    } else {
      report.readWriteTest = { ok: false, reason: "No databases accessible — cannot test read/write" };
    }
    ok(report);
  });
  process.exit(0);
}

await run(async () => {
  switch (cmd) {
    case "search": {
      const query = positional[0] || "";
      const filterVal = flag("filter");
      const body = { query, page_size: 100 };
      if (filterVal === "page" || filterVal === "database")
        body.filter = { value: filterVal, property: "object" };
      const results = await withRetry(() => paginate(cursor =>
        notionFetch("/search", { method: "POST", body: { ...body, start_cursor: cursor } })
      ));
      ok(results);
      break;
    }
    case "query": {
      const dbId = extractId(positional[0] || errExit("database-id required", "NOTION_VALIDATION", "Provide a database ID"));
      const body = { page_size: Number(flag("page-size")) || 100 };
      const f = jsonFlag("filter"); if (f) body.filter = f;
      const s = jsonFlag("sorts"); if (s) body.sorts = s;
      const results = await withRetry(() => paginate(cursor =>
        notionFetch(`/databases/${dbId}/query`, { method: "POST", body: { ...body, start_cursor: cursor } })
      ));
      ok(results);
      break;
    }
    case "create-page": {
      const parentId = extractId(positional[0] || errExit("parent-id required", "NOTION_VALIDATION", "Provide a parent database ID"));
      const props = jsonFlag("properties") || {};
      const content = jsonFlag("content");
      const body = { parent: { database_id: parentId }, properties: props };
      if (content) body.children = content;
      const page = await withRetry(() => notionFetch("/pages", { method: "POST", body }));
      ok(page);
      break;
    }
    case "update-page": {
      const pageId = extractId(positional[0] || errExit("page-id required", "NOTION_VALIDATION", "Provide a page ID"));
      const props = jsonFlag("properties") || errExit("--properties required", "NOTION_VALIDATION", "Provide --properties JSON");
      const page = await withRetry(() => notionFetch(`/pages/${pageId}`, { method: "PATCH", body: { properties: props } }));
      ok(page);
      break;
    }
    case "get-page": {
      const pageId = extractId(positional[0] || errExit("page-id required", "NOTION_VALIDATION", "Provide a page ID or URL"));
      const page = await withRetry(() => notionFetch(`/pages/${pageId}`));
      ok(page);
      break;
    }
    case "get-blocks": {
      const blockId = extractId(positional[0] || errExit("page-id required", "NOTION_VALIDATION", "Provide a page/block ID"));
      const recursive = hasFlag("recursive");
      const blocks = await withRetry(() => paginate(cursor =>
        notionFetch(`/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
      ));
      if (recursive) {
        for (const block of blocks) {
          if (block.has_children) {
            block.children = await withRetry(() => paginate(cursor =>
              notionFetch(`/blocks/${block.id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`)
            ));
          }
        }
      }
      ok(blocks);
      break;
    }
    case "get-comments": {
      const blockId = extractId(positional[0] || errExit("page-id required", "NOTION_VALIDATION", "Provide a page ID"));
      const comments = await withRetry(() => paginate(cursor =>
        notionFetch(`/comments?block_id=${blockId}${cursor ? `&start_cursor=${cursor}` : ""}`)
      ));
      ok(comments);
      break;
    }
    case "create-comment": {
      const pageId = extractId(positional[0] || errExit("page-id required", "NOTION_VALIDATION", "Provide a page ID"));
      const body = flag("body") || errExit("--body required", "NOTION_VALIDATION", "Provide --body text");
      const comment = await withRetry(() => notionFetch("/comments", {
        method: "POST",
        body: { parent: { page_id: pageId }, rich_text: [{ text: { content: body } }] },
      }));
      ok(comment);
      break;
    }
    case "create-database": {
      const parentId = extractId(positional[0] || errExit("parent-id required", "NOTION_VALIDATION", "Provide a parent page ID"));
      const title = flag("title") || "Untitled";
      const props = jsonFlag("properties") || {};
      const db = await withRetry(() => notionFetch("/databases", {
        method: "POST",
        body: {
          parent: { type: "page_id", page_id: parentId },
          title: [{ text: { content: title } }],
          properties: sanitizePropsForCreate(props),
        },
      }));
      ok(db);
      break;
    }
    case "update-database": {
      const dbId = extractId(positional[0] || errExit("database-id required", "NOTION_VALIDATION", "Provide a database ID"));
      const props = jsonFlag("properties") || errExit("--properties required", "NOTION_VALIDATION", "Provide --properties JSON");
      const db = await withRetry(() => notionFetch(`/databases/${dbId}`, { method: "PATCH", body: { properties: props } }));
      ok(db);
      break;
    }
    case "fetch": {
      const url = positional[0] || errExit("notion-url required", "NOTION_VALIDATION", "Provide a Notion URL");
      const id = extractId(url);
      for (const path of [`/pages/${id}`, `/databases/${id}`, `/blocks/${id}`]) {
        try { const res = await withRetry(() => notionFetch(path)); ok(res); } catch { continue; }
      }
      errExit(`Could not resolve: ${url}`, "NOTION_NOT_FOUND", "Check the URL and sharing permissions");
      break;
    }
    default:
      errExit(`Unknown command: ${cmd}`, "NOTION_VALIDATION", "Run with --help to see available commands");
  }
});
