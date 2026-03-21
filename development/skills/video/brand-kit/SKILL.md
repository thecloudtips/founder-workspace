---
name: brand-kit
description: "Activates when managing brand assets for video. Provides brand kit resolution chain, brand-kit.json structure, asset validation rules, and import workflow."
globs: ["commands/video/brand.md", "commands/video/generate.md"]
---

# Brand Kit

Brand kit resolution chain, brand-kit.json schema, asset validation rules, and import workflow for video generation. Used by the `video:brand` and `video:generate` commands.

## 1. Resolution Chain

The brand kit is resolved using a 3-step chain. Stop at the first step that produces a complete result.

### Step 1: Cached JSON

Read `${VIDEO_PATH}/assets/brand-kit.json`. If the file exists and is valid JSON matching the BrandKit interface (at minimum: `company` and `colors.primary` are present), use it directly. No further resolution needed.

### Step 2: Business Context

If no cached JSON exists or it is incomplete (missing required fields), check the business context directory:

```
${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/
```

Read all `.md` files in that directory and extract:
- **Company name** from the first heading or YAML metadata
- **Brand colors** from any color palette mentions (hex values)
- **Font preferences** from font name references
- **Logo references** from image file paths or mentions

Build a partial BrandKit object from whatever is found. If the required fields (`company` and `colors.primary`) are now present, write the result to `${VIDEO_PATH}/assets/brand-kit.json` and use it.

### Step 3: Prompt User

If the BrandKit is still incomplete after Steps 1 and 2, prompt the user for the missing required fields. At minimum, ask for:
- **Company name** (required)
- **Primary brand color** as a hex value (required)

Optionally guide them through a brand wizard for secondary color, accent, fonts, and logo. Write the completed BrandKit to `${VIDEO_PATH}/assets/brand-kit.json`.

### Default Fallbacks

For any missing optional fields after resolution, the `useBrandKit.ts` hook applies these defaults:
- `colors.secondary`: derived from primary (10% lighter)
- `colors.accent`: derived from primary (complementary hue)
- `colors.background`: `#FFFFFF`
- `colors.text`: `#1A1A1A`
- `fonts.heading`: system sans-serif (Inter if available)
- `fonts.body`: system sans-serif

## 2. brand-kit.json Schema

The canonical brand kit file lives at `${VIDEO_PATH}/assets/brand-kit.json`.

```json
{
  "company": "string (required)",
  "colors": {
    "primary": "#hex (required)",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "fonts": {
    "heading": "path relative to assets/ (e.g., fonts/Inter-Bold.woff2)",
    "body": "path relative to assets/"
  },
  "logo": {
    "primary": "path relative to assets/ (required, e.g., logos/logo.svg)",
    "dark": "path (optional, for light backgrounds)",
    "icon": "path (optional, favicon-style)"
  },
  "music": {
    "default": "path to default background track",
    "calm": "path to calm track",
    "energetic": "path to energetic track"
  }
}
```

**Required fields:** `company`, `colors.primary`, `logo.primary`

**All file paths** in brand-kit.json are relative to `${VIDEO_PATH}/assets/`. Templates resolve them at render time via the `useBrandKit` hook.

## 3. Asset Validation

Rules for validating brand assets before they are used in rendering.

### Colors
- Must be valid 6-digit hex colors starting with `#` (e.g., `#FF5733`)
- Reject 3-digit shorthand, RGB, HSL, or named colors — convert to 6-digit hex first

### Fonts
- Must be `.woff2`, `.woff`, `.ttf`, or `.otf` files
- Verify the file exists at the given path relative to `${VIDEO_PATH}/assets/`
- If the font file is missing, warn the user and fall back to system sans-serif

### Logos
- Must be `.svg`, `.png`, or `.jpg` format
- Recommended minimum 200x200px for raster formats (PNG, JPG)
- SVG preferred for scalability across preset dimensions
- Verify file exists at the given path relative to `assets/`

### Music
- Must be `.mp3`, `.wav`, or `.aac` format
- Maximum 10MB per track
- 30-60 seconds recommended for loopable backgrounds
- Verify file exists at the given path relative to `assets/`

### File Paths
- Must be relative paths (no absolute paths starting with `/` or `~`)
- No HTTP/HTTPS URLs in brand-kit.json — external URLs are resolved at runtime only
- Path traversal (`../`) is not allowed

## 4. Import Workflow

How `video:brand --import` pulls brand data from business context files.

**Step 1:** Read all `.md` files in `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/`.

**Step 2:** Extract brand-relevant data:
- **Company name**: first H1 heading or `company` field in YAML frontmatter
- **Color palette**: any hex color values mentioned alongside keywords like "brand", "primary", "accent", "palette"
- **Font names**: mentions of specific typefaces (e.g., "Inter", "Montserrat", "Poppins")
- **Logo file references**: paths to image files mentioned as logos or brand marks

**Step 3:** If a logo file is referenced but not present in `${VIDEO_PATH}/assets/logos/`, copy it there. Create the `logos/` directory if needed.

**Step 4:** If fonts are mentioned by name (e.g., "Inter", "Montserrat"):
- Check if the corresponding `.woff2` file exists in `${VIDEO_PATH}/assets/fonts/`
- If not found, suggest the user download the font and place it in `assets/fonts/`
- Provide a direct link to Google Fonts when the font is available there

**Step 5:** Build `brand-kit.json` from the extracted data, filling in as many fields as possible.

**Step 6:** Write the result to `${VIDEO_PATH}/assets/brand-kit.json`.

**Step 7:** If updating an existing `brand-kit.json`, show a diff of the changes before writing. Ask the user to confirm the update.

## 5. Font Registration

How fonts are loaded in Remotion templates via `@remotion/fonts`.

### Custom Fonts

1. Place `.woff2` font files in `${VIDEO_PATH}/assets/fonts/`
2. Reference the font path in `brand-kit.json` under `fonts.heading` or `fonts.body`
3. The `useBrandKit` hook resolves font paths and registers them with Remotion at composition mount time
4. Templates access loaded fonts via `brandKit.fonts.heading` and `brandKit.fonts.body`

### Google Fonts

If `@remotion/google-fonts` is available in the project dependencies:
- Use the package to load fonts by name (e.g., `loadFont("Inter")`)
- This avoids the need to download and bundle font files manually

If `@remotion/google-fonts` is not installed:
- Download the `.woff2` files from Google Fonts
- Place them in `assets/fonts/`
- Reference them in `brand-kit.json` as custom fonts

### Font Loading Order

1. Check `brand-kit.json` for explicit font paths
2. If paths are set, load from local `assets/fonts/` directory
3. If font names are set without paths, attempt `@remotion/google-fonts` load
4. If all else fails, fall back to system sans-serif
