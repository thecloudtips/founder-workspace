import { staticFile } from "remotion";
import type { BrandKit } from "../types";

const DEFAULT_BRAND_KIT: BrandKit = {
  company: "My Company",
  colors: {
    primary: "#2563EB",
    secondary: "#1E40AF",
    accent: "#F59E0B",
    background: "#0F172A",
    text: "#F8FAFC",
  },
  fonts: {
    heading: "fonts/Inter-Bold.woff2",
    body: "fonts/Inter-Regular.woff2",
  },
  logo: {
    primary: "logos/logo.svg",
  },
};

/**
 * Resolve brand kit from props. Templates receive brandKit as a prop,
 * populated by the FOS command from assets/brand-kit.json.
 * Falls back to defaults for any missing values.
 */
export function useBrandKit(brandKit?: Partial<BrandKit>): BrandKit {
  return {
    ...DEFAULT_BRAND_KIT,
    ...brandKit,
    colors: { ...DEFAULT_BRAND_KIT.colors, ...brandKit?.colors },
    fonts: { ...DEFAULT_BRAND_KIT.fonts, ...brandKit?.fonts },
    logo: { ...DEFAULT_BRAND_KIT.logo, ...brandKit?.logo },
    music: { ...DEFAULT_BRAND_KIT.music, ...brandKit?.music },
  };
}

/**
 * Resolve a brand asset path to a staticFile reference.
 */
export function brandAsset(path: string): string {
  return staticFile(`../assets/${path}`);
}
