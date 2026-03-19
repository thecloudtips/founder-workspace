import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Sequence,
  Audio,
  Img,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { LowerThird } from "../components/LowerThird";
import { ProgressBar } from "../components/ProgressBar";
import { SlideTransition } from "../components/SlideTransition";
import { useBrandKit, brandAsset } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import { secondsToFrames } from "../lib/timing";
import type { BrandKit, TransitionType } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Section {
  heading: string;
  body: string;
  icon?: string;
}

export interface ExplainerProps {
  title: string;
  sections: Section[];
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerSection?: number; // seconds, default 6
  transition?: TransitionType;
}

// ---------------------------------------------------------------------------
// Defaults & metadata
// ---------------------------------------------------------------------------

export const defaultProps: ExplainerProps = {
  title: "How It Works",
  sections: [
    { heading: "Connect", body: "Link your accounts in one click.", icon: undefined },
    { heading: "Automate", body: "Set up rules that run while you sleep.", icon: undefined },
    { heading: "Grow", body: "Watch your metrics climb every week.", icon: undefined },
  ],
  music: undefined,
  durationPerSection: 6,
  transition: "fade",
};

export const calculateMetadata = ({
  props,
}: {
  props: ExplainerProps;
}) => {
  const secDur = props.durationPerSection ?? 6;
  const totalSeconds = 3 + props.sections.length * secDur + 3;
  return {
    durationInFrames: totalSeconds * 30,
    fps: 30,
    width: 1920,
    height: 1080,
  };
};

// ---------------------------------------------------------------------------
// Slide sub-components
// ---------------------------------------------------------------------------

const IntroSlide: React.FC<{
  title: string;
  logoSrc: string;
  brand: ReturnType<typeof useBrandKit>;
}> = ({ title, logoSrc, brand }) => (
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
      text={title}
      fontSize={64}
      color={brand.colors.text}
      animationType="slide-up"
      enterFrame={5}
      bold
    />
    <div style={{ marginTop: 32 }}>
      <Logo src={logoSrc} position="center" width={100} enterFrame={20} />
    </div>
  </AbsoluteFill>
);

const SectionSlide: React.FC<{
  section: Section;
  index: number;
  total: number;
  brand: ReturnType<typeof useBrandKit>;
}> = ({ section, index, total, brand }) => {
  const frame = useCurrentFrame();
  const iconSrc = useAsset(section.icon);

  const iconOpacity = iconSrc
    ? interpolate(frame, [10, 25], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: brand.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 120px",
      }}
    >
      {/* Optional icon */}
      {iconSrc && (
        <div style={{ opacity: iconOpacity, marginBottom: 24 }}>
          <Img src={iconSrc} style={{ width: 80, height: 80 }} />
        </div>
      )}

      {/* Section heading */}
      <TextOverlay
        text={section.heading}
        fontSize={48}
        color={brand.colors.text}
        animationType="slide-up"
        enterFrame={5}
        bold
      />

      {/* Section body */}
      <div style={{ marginTop: 20, maxWidth: 900, textAlign: "center" }}>
        <TextOverlay
          text={section.body}
          fontSize={28}
          color={brand.colors.text}
          animationType="fade"
          enterFrame={18}
        />
      </div>

      {/* Section counter (LowerThird) */}
      <LowerThird
        name={`${index + 1}/${total}`}
        title=""
        backgroundColor={brand.colors.primary}
        textColor={brand.colors.text}
        enterFrame={8}
      />
    </AbsoluteFill>
  );
};

const ClosingSlide: React.FC<{
  logoSrc: string;
  brand: ReturnType<typeof useBrandKit>;
}> = ({ logoSrc, brand }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Logo src={logoSrc} position="center" width={140} enterFrame={0} />
    <div style={{ position: "absolute", bottom: 140 }}>
      <TextOverlay
        text="Thank you"
        fontSize={36}
        color={brand.colors.text}
        animationType="fade"
        enterFrame={10}
      />
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const Explainer: React.FC<ExplainerProps> = ({
  title,
  sections,
  brandKit: brandKitProp,
  music,
  durationPerSection = 6,
  transition = "fade",
}) => {
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = useAsset(music);
  const logoSrc = brandAsset(brand.logo.primary);

  const introFrames = secondsToFrames(3, fps);
  const sectionFrames = secondsToFrames(durationPerSection, fps);
  const closingFrames = secondsToFrames(3, fps);

  // Build slide durations array for SlideTransition
  const slideDurations = [
    introFrames,
    ...sections.map(() => sectionFrames),
    closingFrames,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background }}>
      {musicSrc && <Audio src={musicSrc} volume={0.25} />}

      <SlideTransition
        type={transition}
        durationInFrames={15}
        slideDurations={slideDurations}
      >
        {/* Intro */}
        <IntroSlide title={title} logoSrc={logoSrc} brand={brand} />

        {/* Sections */}
        {sections.map((section, idx) => (
          <SectionSlide
            key={idx}
            section={section}
            index={idx}
            total={sections.length}
            brand={brand}
          />
        ))}

        {/* Closing */}
        <ClosingSlide logoSrc={logoSrc} brand={brand} />
      </SlideTransition>

      {/* Progress bar throughout */}
      <ProgressBar color={brand.colors.accent} />
    </AbsoluteFill>
  );
};
