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
import { useBrandKit } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import type { BrandKit } from "../types";
import { secondsToFrames } from "../lib/timing";

export interface SocialQuoteProps {
  quote: string;
  author: string;
  authorTitle?: string;
  authorImage?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number;
}

export const SocialQuote: React.FC<SocialQuoteProps> = ({
  quote,
  author,
  authorTitle,
  authorImage,
  brandKit: brandKitProp,
  music,
  duration = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const musicSrc = music ? useAsset(music) : undefined;
  const authorImgSrc = authorImage ? useAsset(authorImage) : undefined;
  const logoSrc = useAsset(brand.logo.primary);

  const wordCount = quote.split(" ").length;
  const authorEnterFrame = wordCount * 3 + 15;

  const quoteMarkOpacity = interpolate(
    frame,
    [0, 20],
    [0, 0.15],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const authorOpacity = interpolate(
    frame,
    [authorEnterFrame, authorEnterFrame + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const authorTranslateY = interpolate(
    frame,
    [authorEnterFrame, authorEnterFrame + 15],
    [20, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const imageOpacity = interpolate(
    frame,
    [authorEnterFrame, authorEnterFrame + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const imageScale = interpolate(
    frame,
    [authorEnterFrame, authorEnterFrame + 15],
    [0.8, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
      }}
    >
      {/* Decorative quote mark */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          fontSize: 200,
          fontFamily: "Georgia, serif",
          color: brand.colors.text,
          opacity: quoteMarkOpacity,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </div>

      {/* Quote text */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        <TextOverlay
          text={quote}
          fontSize={52}
          fontFamily={brand.fonts.heading}
          color={brand.colors.text}
          animationType="word-by-word"
          enterFrame={5}
          bold
        />

        {/* Author attribution */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            opacity: authorOpacity,
            transform: `translateY(${authorTranslateY}px)`,
          }}
        >
          {authorImgSrc && (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                overflow: "hidden",
                opacity: imageOpacity,
                transform: `scale(${imageScale})`,
              }}
            >
              <Img
                src={authorImgSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontFamily: brand.fonts.heading,
                color: brand.colors.text,
                fontWeight: 700,
              }}
            >
              {author}
            </span>
            {authorTitle && (
              <span
                style={{
                  fontSize: 22,
                  fontFamily: brand.fonts.body,
                  color: brand.colors.text,
                  opacity: 0.7,
                  marginTop: 4,
                }}
              >
                {authorTitle}
              </span>
            )}
          </div>
        </div>
      </AbsoluteFill>

      {/* Logo bottom-right */}
      {logoSrc && (
        <Logo
          src={logoSrc}
          width={80}
          position="bottom-right"
          enterFrame={authorEnterFrame + 10}
        />
      )}

      {musicSrc && <Audio src={musicSrc} volume={0.2} />}
    </AbsoluteFill>
  );
};

export const calculateMetadata = async ({
  props,
}: {
  props: SocialQuoteProps;
  defaultProps: SocialQuoteProps;
}): Promise<{
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}> => {
  const fps = 30;
  const duration = props.duration ?? 8;
  const durationInFrames = secondsToFrames(duration, fps);
  return { durationInFrames, fps, width: 1080, height: 1080 };
};

export const defaultProps: SocialQuoteProps = {
  quote: "The best way to predict the future is to create it.",
  author: "Peter Drucker",
  authorTitle: "Management Consultant",
  duration: 8,
};
