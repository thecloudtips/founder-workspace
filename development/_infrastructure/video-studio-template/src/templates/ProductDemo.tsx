import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Sequence,
  Audio,
  OffthreadVideo,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit, brandAsset } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import type { BrandKit } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Callout {
  text: string;
  startFrame: number;
  endFrame: number;
  position: { x: number; y: number };
}

export interface ProductDemoProps {
  title: string;
  subtitle?: string;
  screenRecording: string;
  callouts?: Callout[];
  brandKit?: Partial<BrandKit>;
  music?: string;
}

// ---------------------------------------------------------------------------
// Defaults & metadata
// ---------------------------------------------------------------------------

export const defaultProps: ProductDemoProps = {
  title: "See It in Action",
  subtitle: "A quick walkthrough of the core workflow",
  screenRecording: "public/demo-recording.mp4",
  callouts: [],
  music: undefined,
};

export const calculateMetadata = ({
  props,
}: {
  props: ProductDemoProps;
}) => {
  // Intro 2 s + recording (default 26 s) + outro 2 s = 30 s @ 30 fps = 900
  return {
    durationInFrames: 900,
    fps: 30,
    width: 1920,
    height: 1080,
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProductDemo: React.FC<ProductDemoProps> = ({
  title,
  subtitle,
  screenRecording,
  callouts = [],
  brandKit: brandKitProp,
  music,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const recordingSrc = useAsset(screenRecording);
  const musicSrc = useAsset(music);
  const logoSrc = brandAsset(brand.logo.primary);

  const introFrames = 60; // 2 s
  const outroFrames = 60; // 2 s
  const recordingStart = introFrames;
  const recordingEnd = durationInFrames - outroFrames;

  // ------ Intro background fade-out ------
  const introBgOpacity = interpolate(
    frame,
    [introFrames - 10, introFrames],
    [1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  // ------ Outro background fade-in ------
  const outroBgOpacity = interpolate(
    frame,
    [recordingEnd, recordingEnd + 10],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background }}>
      {/* ---- Background music ---- */}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}

      {/* ---- Intro slide (0 – 60 frames) ---- */}
      <Sequence from={0} durationInFrames={introFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: introBgOpacity,
          }}
        >
          <TextOverlay
            text={title}
            fontSize={64}
            color={brand.colors.text}
            animationType="slide-up"
            enterFrame={5}
            bold
          />
          {subtitle && (
            <div style={{ marginTop: 16 }}>
              <TextOverlay
                text={subtitle}
                fontSize={32}
                color={brand.colors.text}
                animationType="fade"
                enterFrame={18}
              />
            </div>
          )}
          <Logo src={logoSrc} position="center" width={100} enterFrame={25} />
        </AbsoluteFill>
      </Sequence>

      {/* ---- Screen recording section ---- */}
      <Sequence from={recordingStart} durationInFrames={recordingEnd - recordingStart}>
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          {/* Device frame border */}
          <div
            style={{
              position: "relative",
              width: "90%",
              height: "85%",
              borderRadius: 16,
              border: `3px solid ${brand.colors.accent}`,
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {recordingSrc && (
              <OffthreadVideo
                src={recordingSrc}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>

          {/* ---- Callout bubbles ---- */}
          {callouts.map((callout, idx) => {
            const calloutOpacity = interpolate(
              frame - recordingStart,
              [callout.startFrame, callout.startFrame + 8, callout.endFrame - 8, callout.endFrame],
              [0, 1, 1, 0],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
            );

            return (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: callout.position.x,
                  top: callout.position.y,
                  opacity: calloutOpacity,
                  backgroundColor: "#FFFFFF",
                  color: "#1E293B",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 20,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                  maxWidth: 320,
                }}
              >
                {callout.text}
              </div>
            );
          })}
        </AbsoluteFill>
      </Sequence>

      {/* ---- Outro slide ---- */}
      <Sequence from={recordingEnd} durationInFrames={outroFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: outroBgOpacity,
          }}
        >
          <Logo src={logoSrc} position="center" width={140} enterFrame={0} />
          <div style={{ position: "absolute", bottom: 120 }}>
            <TextOverlay
              text="Learn more"
              fontSize={32}
              color={brand.colors.text}
              animationType="fade"
              enterFrame={10}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ---- Progress bar ---- */}
      <ProgressBar color={brand.colors.accent} />
    </AbsoluteFill>
  );
};
