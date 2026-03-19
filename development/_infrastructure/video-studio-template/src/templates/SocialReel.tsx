import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  Img,
  AbsoluteFill,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { SlideTransition } from "../components/SlideTransition";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import { useStockAsset } from "../hooks/useAsset";
import type { BrandKit, TransitionType } from "../types";
import { secondsToFrames } from "../lib/timing";

export interface SocialReelProps {
  slides: Array<{ headline: string; body?: string; image?: string }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerSlide?: number;
  transition?: TransitionType;
  showLogo?: boolean;
  ctaText?: string;
}

export const SocialReel: React.FC<SocialReelProps> = ({
  slides,
  brandKit: brandKitProp,
  music,
  durationPerSlide = 3,
  transition = "slide",
  showLogo = true,
  ctaText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = music ? useAsset(music) : undefined;
  const logoSrc = useAsset(brand.logo.primary);

  const slideFrames = secondsToFrames(durationPerSlide, fps);
  const logoFrames = showLogo ? secondsToFrames(2, fps) : 0;

  const slideChildren = slides.map((slide, i) => {
    const imgSrc = slide.image ? useAsset(slide.image) : undefined;

    return (
      <AbsoluteFill
        key={i}
        style={{ backgroundColor: brand.colors.background }}
      >
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 60,
          }}
        >
          {imgSrc && (
            <Img
              src={imgSrc}
              style={{
                width: "100%",
                height: "60%",
                objectFit: "cover",
                borderRadius: 16,
                marginBottom: 40,
              }}
            />
          )}
          <TextOverlay
            text={slide.headline}
            fontSize={64}
            fontFamily={brand.fonts.heading}
            color={brand.colors.text}
            animationType="slide-up"
            bold
          />
          {slide.body && (
            <div style={{ marginTop: 24 }}>
              <TextOverlay
                text={slide.body}
                fontSize={36}
                fontFamily={brand.fonts.body}
                color={brand.colors.text}
                enterFrame={10}
                animationType="fade"
              />
            </div>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  });

  if (showLogo && logoSrc) {
    slideChildren.push(
      <AbsoluteFill
        key="logo-slide"
        style={{
          backgroundColor: brand.colors.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Logo src={logoSrc} width={200} position="center" enterFrame={0} />
        {ctaText && (
          <div
            style={{
              position: "absolute",
              bottom: 200,
              width: "100%",
              textAlign: "center",
            }}
          >
            <TextOverlay
              text={ctaText}
              fontSize={40}
              fontFamily={brand.fonts.body}
              color={brand.colors.accent}
              enterFrame={15}
              animationType="fade"
            />
          </div>
        )}
      </AbsoluteFill>,
    );
  }

  const slideDurations = slides.map(() => slideFrames);
  if (showLogo) {
    slideDurations.push(logoFrames);
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
  props: SocialReelProps;
  defaultProps: SocialReelProps;
}): Promise<{
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}> => {
  const fps = 30;
  const durationPerSlide = props.durationPerSlide ?? 3;
  const showLogo = props.showLogo ?? true;
  const slideCount = props.slides.length;
  const durationInFrames =
    secondsToFrames(slideCount * durationPerSlide, fps) +
    (showLogo ? secondsToFrames(2, fps) : 0);
  return { durationInFrames, fps, width: 1080, height: 1920 };
};

export const defaultProps: SocialReelProps = {
  slides: [
    { headline: "Welcome to Our Brand" },
    { headline: "We Build Great Products", body: "Trusted by thousands" },
    { headline: "Innovation First", body: "Cutting-edge solutions" },
    { headline: "Join the Community", body: "Be part of something big" },
    { headline: "Get Started Today" },
  ],
  durationPerSlide: 3,
  transition: "slide",
  showLogo: true,
  ctaText: "Learn more at example.com",
};
