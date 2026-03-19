import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  AbsoluteFill,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { SlideTransition } from "../components/SlideTransition";
import { NumberCounter } from "../components/NumberCounter";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import type { BrandKit, TransitionType } from "../types";
import { secondsToFrames } from "../lib/timing";

export interface SocialListicleProps {
  title: string;
  items: Array<{ number: number; text: string; icon?: string }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerItem?: number;
  transition?: TransitionType;
}

export const SocialListicle: React.FC<SocialListicleProps> = ({
  title,
  items,
  brandKit: brandKitProp,
  music,
  durationPerItem = 3,
  transition = "slide",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = music ? useAsset(music) : undefined;
  const logoSrc = useAsset(brand.logo.primary);

  const titleFrames = secondsToFrames(1.5, fps);
  const itemFrames = secondsToFrames(durationPerItem, fps);
  const closingFrames = secondsToFrames(2, fps);

  const slideChildren: React.ReactNode[] = [];
  const slideDurations: number[] = [];

  // Title slide
  slideChildren.push(
    <AbsoluteFill
      key="title"
      style={{
        backgroundColor: brand.colors.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <TextOverlay
        text={title}
        fontSize={72}
        fontFamily={brand.fonts.heading}
        color={brand.colors.text}
        animationType="slide-up"
        bold
      />
    </AbsoluteFill>,
  );
  slideDurations.push(titleFrames);

  // Item slides
  items.forEach((item, i) => {
    slideChildren.push(
      <AbsoluteFill
        key={`item-${i}`}
        style={{
          backgroundColor: brand.colors.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          gap: 40,
        }}
      >
        {item.icon && (
          <div
            style={{
              fontSize: 80,
              marginBottom: 10,
            }}
          >
            {item.icon}
          </div>
        )}
        <NumberCounter
          from={0}
          to={item.number}
          fontSize={120}
          color={brand.colors.accent}
          fontFamily={brand.fonts.heading}
          durationFrames={20}
        />
        <TextOverlay
          text={item.text}
          fontSize={44}
          fontFamily={brand.fonts.body}
          color={brand.colors.text}
          enterFrame={10}
          animationType="slide-up"
        />
      </AbsoluteFill>,
    );
    slideDurations.push(itemFrames);
  });

  // Closing logo slide
  if (logoSrc) {
    slideChildren.push(
      <AbsoluteFill
        key="closing"
        style={{
          backgroundColor: brand.colors.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Logo src={logoSrc} width={200} position="center" enterFrame={0} />
      </AbsoluteFill>,
    );
    slideDurations.push(closingFrames);
  }

  return (
    <AbsoluteFill>
      <SlideTransition
        type={transition}
        durationInFrames={15}
        slideDurations={slideDurations}
      >
        {slideChildren}
      </SlideTransition>
      <ProgressBar color={brand.colors.accent} />
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
    </AbsoluteFill>
  );
};

export const calculateMetadata = async ({
  props,
}: {
  props: SocialListicleProps;
  defaultProps: SocialListicleProps;
}): Promise<{
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}> => {
  const fps = 30;
  const durationPerItem = props.durationPerItem ?? 3;
  const totalSeconds = 1.5 + props.items.length * durationPerItem + 2;
  const durationInFrames = secondsToFrames(totalSeconds, fps);
  return { durationInFrames, fps, width: 1080, height: 1920 };
};

export const defaultProps: SocialListicleProps = {
  title: "5 Tips for Productivity",
  items: [
    { number: 1, text: "Start your day with a clear plan" },
    { number: 2, text: "Use time-blocking for deep work" },
    { number: 3, text: "Take regular breaks to recharge" },
    { number: 4, text: "Batch similar tasks together" },
    { number: 5, text: "Review and reflect each evening" },
  ],
  durationPerItem: 3,
  transition: "slide",
};
