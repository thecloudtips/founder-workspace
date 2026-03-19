import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  Img,
  Sequence,
  AbsoluteFill,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import type { BrandKit } from "../types";
import { secondsToFrames } from "../lib/timing";

export interface SocialBeforeAfterProps {
  before: { label: string; image: string; description?: string };
  after: { label: string; image: string; description?: string };
  title?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number;
}

export const SocialBeforeAfter: React.FC<SocialBeforeAfterProps> = ({
  before,
  after,
  title,
  brandKit: brandKitProp,
  music,
  duration = 10,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = music ? useAsset(music) : undefined;
  const logoSrc = useAsset(brand.logo.primary);
  const beforeImgSrc = useAsset(before.image);
  const afterImgSrc = useAsset(after.image);

  const titleFrames = title ? secondsToFrames(1.5, fps) : 0;
  const beforeFrames = secondsToFrames(3, fps);
  const wipeFrames = secondsToFrames(1, fps);
  const afterFrames = secondsToFrames(3, fps);
  const comparisonFrames = secondsToFrames(2, fps);

  let offset = 0;
  const titleStart = 0;
  offset += titleFrames;

  const beforeStart = offset;
  offset += beforeFrames;

  const wipeStart = offset;
  offset += wipeFrames;

  const afterStart = offset;
  offset += afterFrames;

  const comparisonStart = offset;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background }}>
      {/* Title slide */}
      {title && (
        <Sequence from={titleStart} durationInFrames={titleFrames}>
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 60,
            }}
          >
            <TextOverlay
              text={title}
              fontSize={64}
              fontFamily={brand.fonts.heading}
              color={brand.colors.text}
              animationType="slide-up"
              bold
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Before section */}
      <Sequence from={beforeStart} durationInFrames={beforeFrames}>
        <AbsoluteFill>
          {beforeImgSrc && (
            <Img
              src={beforeImgSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          <LabelOverlay
            label={before.label}
            description={before.description}
            brand={brand}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Wipe transition */}
      <Sequence from={wipeStart} durationInFrames={wipeFrames}>
        <WipeTransition
          beforeSrc={beforeImgSrc}
          afterSrc={afterImgSrc}
          beforeLabel={before.label}
          afterLabel={after.label}
          brand={brand}
          durationFrames={wipeFrames}
        />
      </Sequence>

      {/* After section */}
      <Sequence from={afterStart} durationInFrames={afterFrames}>
        <AbsoluteFill>
          {afterImgSrc && (
            <Img
              src={afterImgSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          <LabelOverlay
            label={after.label}
            description={after.description}
            brand={brand}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Side-by-side comparison */}
      <Sequence from={comparisonStart} durationInFrames={comparisonFrames}>
        <SideBySide
          beforeSrc={beforeImgSrc}
          afterSrc={afterImgSrc}
          beforeLabel={before.label}
          afterLabel={after.label}
          brand={brand}
        />
      </Sequence>

      <ProgressBar color={brand.colors.accent} />
      {logoSrc && <Logo src={logoSrc} width={80} position="bottom-right" />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Internal sub-components                                            */
/* ------------------------------------------------------------------ */

interface LabelOverlayProps {
  label: string;
  description?: string;
  brand: ReturnType<typeof useBrandKit>;
}

const LabelOverlay: React.FC<LabelOverlayProps> = ({
  label,
  description,
  brand,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const translateY = interpolate(frame, [0, 15], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "40px 60px",
        background: "rgba(0, 0, 0, 0.55)",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontFamily: brand.fonts.heading,
          fontWeight: 700,
          color: brand.colors.text,
        }}
      >
        {label}
      </div>
      {description && (
        <div
          style={{
            fontSize: 28,
            fontFamily: brand.fonts.body,
            color: brand.colors.text,
            opacity: 0.8,
            marginTop: 8,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};

interface WipeTransitionProps {
  beforeSrc: string | undefined;
  afterSrc: string | undefined;
  beforeLabel: string;
  afterLabel: string;
  brand: ReturnType<typeof useBrandKit>;
  durationFrames: number;
}

const WipeTransition: React.FC<WipeTransitionProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  brand,
  durationFrames,
}) => {
  const frame = useCurrentFrame();

  const wipeProgress = interpolate(
    frame,
    [0, durationFrames],
    [0, 100],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill>
      {/* Before image (full) */}
      {beforeSrc && (
        <Img
          src={beforeSrc}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* After image (wiping in from left) */}
      {afterSrc && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${wipeProgress}%`,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Img
            src={afterSrc}
            style={{
              width: "100vw",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* Wipe divider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${wipeProgress}%`,
          width: 4,
          height: "100%",
          backgroundColor: brand.colors.accent,
        }}
      />
    </AbsoluteFill>
  );
};

interface SideBySideProps {
  beforeSrc: string | undefined;
  afterSrc: string | undefined;
  beforeLabel: string;
  afterLabel: string;
  brand: ReturnType<typeof useBrandKit>;
}

const SideBySide: React.FC<SideBySideProps> = ({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
  brand,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = interpolate(frame, [0, 15], [1.05, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* Before half */}
      <div
        style={{
          width: "50%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {beforeSrc && (
          <Img
            src={beforeSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 32,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: brand.colors.text,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {beforeLabel}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 4,
          height: "100%",
          backgroundColor: brand.colors.accent,
        }}
      />

      {/* After half */}
      <div
        style={{
          width: "50%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {afterSrc && (
          <Img
            src={afterSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 32,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: brand.colors.text,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {afterLabel}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const calculateMetadata = async ({
  props,
}: {
  props: SocialBeforeAfterProps;
  defaultProps: SocialBeforeAfterProps;
}): Promise<{
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}> => {
  const fps = 30;
  const titleSeconds = props.title ? 1.5 : 0;
  const totalSeconds = titleSeconds + 3 + 1 + 3 + 2; // title + before + wipe + after + comparison
  const durationInFrames = secondsToFrames(totalSeconds, fps);
  return { durationInFrames, fps, width: 1080, height: 1920 };
};

export const defaultProps: SocialBeforeAfterProps = {
  before: {
    label: "Before",
    image: "stock/placeholder-before.jpg",
    description: "The starting point",
  },
  after: {
    label: "After",
    image: "stock/placeholder-after.jpg",
    description: "The transformation",
  },
  title: "See the Difference",
  duration: 10,
};
