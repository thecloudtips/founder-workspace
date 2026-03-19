import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Sequence,
  Audio,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { NumberCounter } from "../components/NumberCounter";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit, brandAsset } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import { secondsToFrames } from "../lib/timing";
import type { BrandKit } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Metric {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface PitchHighlightProps {
  headline: string;
  metrics: Metric[];
  ctaText?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 20
}

// ---------------------------------------------------------------------------
// Defaults & metadata
// ---------------------------------------------------------------------------

export const defaultProps: PitchHighlightProps = {
  headline: "Our Impact",
  metrics: [
    { value: 2500000, label: "Annual Revenue", prefix: "$" },
    { value: 50, label: "Active Users", suffix: "K" },
    { value: 140, label: "Growth Rate", suffix: "%" },
  ],
  ctaText: "Join us today",
  music: undefined,
  duration: 20,
};

export const calculateMetadata = ({
  props,
}: {
  props: PitchHighlightProps;
}) => {
  const metricsCount = props.metrics.length;
  const hasSummary = metricsCount >= 2 && metricsCount <= 3;
  const totalSeconds = 3 + metricsCount * 3 + (hasSummary ? 3 : 0) + 3;
  return {
    durationInFrames: totalSeconds * 30,
    fps: 30,
    width: 1920,
    height: 1080,
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PitchHighlight: React.FC<PitchHighlightProps> = ({
  headline,
  metrics,
  ctaText = "Join us today",
  brandKit: brandKitProp,
  music,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = useAsset(music);
  const logoSrc = brandAsset(brand.logo.primary);

  const headlineFrames = secondsToFrames(3, fps);
  const metricFrames = secondsToFrames(3, fps);
  const hasSummary = metrics.length >= 2 && metrics.length <= 3;
  const summaryFrames = hasSummary ? secondsToFrames(3, fps) : 0;
  const ctaFrames = secondsToFrames(3, fps);

  // Cumulative offsets
  let offset = 0;
  const headlineStart = offset;
  offset += headlineFrames;

  const metricStarts = metrics.map((_, idx) => {
    const start = offset + idx * metricFrames;
    return start;
  });
  offset += metrics.length * metricFrames;

  const summaryStart = offset;
  offset += summaryFrames;

  const ctaStart = offset;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background }}>
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}

      {/* ---- Headline slide ---- */}
      <Sequence from={headlineStart} durationInFrames={headlineFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 100px",
          }}
        >
          <TextOverlay
            text={headline}
            fontSize={64}
            color={brand.colors.text}
            animationType="slide-up"
            enterFrame={5}
            bold
          />
        </AbsoluteFill>
      </Sequence>

      {/* ---- Individual metric slides ---- */}
      {metrics.map((metric, idx) => (
        <Sequence
          key={idx}
          from={metricStarts[idx]}
          durationInFrames={metricFrames}
        >
          <AbsoluteFill
            style={{
              background: brand.colors.background,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NumberCounter
              to={metric.value}
              prefix={metric.prefix ?? ""}
              suffix={metric.suffix ?? ""}
              enterFrame={5}
              durationFrames={60}
              fontSize={96}
              color={brand.colors.accent}
            />
            <div style={{ marginTop: 16 }}>
              <TextOverlay
                text={metric.label}
                fontSize={32}
                color={brand.colors.text}
                animationType="fade"
                enterFrame={15}
              />
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* ---- Side-by-side summary (2-3 metrics only) ---- */}
      {hasSummary && (
        <Sequence from={summaryStart} durationInFrames={secondsToFrames(3, fps)}>
          <AbsoluteFill
            style={{
              background: brand.colors.background,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {metrics.map((metric, idx) => {
                const enterDelay = idx * 8;
                const itemOpacity = interpolate(
                  frame - summaryStart,
                  [enterDelay, enterDelay + 15],
                  [0, 1],
                  { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
                );
                const itemTranslateY = interpolate(
                  frame - summaryStart,
                  [enterDelay, enterDelay + 15],
                  [20, 0],
                  { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
                );

                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      opacity: itemOpacity,
                      transform: `translateY(${itemTranslateY}px)`,
                    }}
                  >
                    <NumberCounter
                      to={metric.value}
                      prefix={metric.prefix ?? ""}
                      suffix={metric.suffix ?? ""}
                      enterFrame={0}
                      durationFrames={45}
                      fontSize={64}
                      color={brand.colors.accent}
                    />
                    <div style={{ marginTop: 8 }}>
                      <TextOverlay
                        text={metric.label}
                        fontSize={24}
                        color={brand.colors.text}
                        animationType="fade"
                        enterFrame={10}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ---- CTA slide ---- */}
      <Sequence from={ctaStart} durationInFrames={ctaFrames}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextOverlay
            text={ctaText}
            fontSize={48}
            color={brand.colors.text}
            animationType="fade"
            enterFrame={5}
          />
          <div style={{ marginTop: 40 }}>
            <Logo src={logoSrc} position="center" width={120} enterFrame={15} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ---- Progress bar ---- */}
      <ProgressBar color={brand.colors.accent} />
    </AbsoluteFill>
  );
};
