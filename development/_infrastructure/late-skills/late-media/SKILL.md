---
name: late-media
description: "Late.dev media upload workflow with presigned URLs, validation, and platform-specific constraints"
---

# Late.dev Media Upload Workflow

## Upload Flow

1. **Validate** file exists, check type/size against platform limits
2. **Validate content-type** matches actual file magic bytes (security)
3. **Get presigned URL**: `late-tool.mjs media presign --filename=photo.jpg --content-type=image/jpeg`
4. **Upload** file to presigned URL via PUT (handled internally)
5. **Reference** `publicUrl` in post's `mediaItems` array

```bash
# Step 1: Get presigned URL
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs media presign \
  --filename=photo.jpg --content-type=image/jpeg
# Returns: { "publicUrl": "https://...", "uploadUrl": "https://..." }
# Note: uploadUrl is internal only — never log it

# Step 2: Reference in post
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Check this out!" \
  --media='[{"publicUrl":"https://...","type":"image"}]'
```

## Platform Constraints

| Platform | Images | Video | Other |
|----------|--------|-------|-------|
| LinkedIn | JPEG/PNG/GIF (multiple) | MP4/MOV | PDF docs (100MB, 300pp max) |
| X/Twitter | 4 images max OR 1 video | MP4/MOV | — |

## Security

- Presigned URLs are bearer tokens — **never persist to logs or DB**
- Use immediately after creation (TTL ~15 minutes, Late.dev-controlled). If the API allows configuring TTL, request 5 minutes maximum to minimize exposure window
- Validate content-type matches file magic bytes before upload
- Max 5GB per file
