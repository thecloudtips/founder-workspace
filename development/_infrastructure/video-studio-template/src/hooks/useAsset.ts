import { staticFile } from "remotion";

/**
 * Resolve an asset path. Supports:
 * - Absolute paths (returned as-is)
 * - HTTP URLs (returned as-is)
 * - Relative paths prefixed with public/ (resolved via staticFile)
 * - All other paths (resolved relative to assets/)
 */
export function useAsset(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  if (path.startsWith("public/")) return staticFile(path.replace("public/", ""));
  return staticFile(`../assets/${path}`);
}

/**
 * Resolve a stock asset path (from public/stock/).
 */
export function useStockAsset(path: string): string {
  return staticFile(`stock/${path}`);
}
