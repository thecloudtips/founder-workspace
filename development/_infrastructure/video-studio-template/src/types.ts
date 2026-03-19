export interface BrandKit {
  company: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logo: {
    primary: string;
    dark?: string;
    icon?: string;
  };
  music?: {
    default?: string;
    calm?: string;
    energetic?: string;
  };
}

export interface OutputPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  codec: "h264" | "gif";
}

export const OUTPUT_PRESETS: Record<string, OutputPreset> = {
  reel: { name: "reel", width: 1080, height: 1920, fps: 30, codec: "h264" },
  story: { name: "story", width: 1080, height: 1920, fps: 30, codec: "h264" },
  square: { name: "square", width: 1080, height: 1080, fps: 30, codec: "h264" },
  landscape: { name: "landscape", width: 1920, height: 1080, fps: 30, codec: "h264" },
  gif: { name: "gif", width: 800, height: 800, fps: 15, codec: "gif" },
};

export type TransitionType = "fade" | "slide" | "wipe" | "flip";
