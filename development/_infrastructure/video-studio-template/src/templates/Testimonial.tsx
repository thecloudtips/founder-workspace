import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Audio,
  Img,
} from "remotion";
import { TextOverlay } from "../components/TextOverlay";
import { Logo } from "../components/Logo";
import { LowerThird } from "../components/LowerThird";
import { ProgressBar } from "../components/ProgressBar";
import { useBrandKit, brandAsset } from "../hooks/useBrandKit";
import { useAsset } from "../hooks/useAsset";
import type { BrandKit } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TestimonialProps {
  quote: string;
  customerName: string;
  customerTitle: string;
  customerCompany?: string;
  customerImage?: string;
  companyLogo?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 15
}

// ---------------------------------------------------------------------------
// Defaults & metadata
// ---------------------------------------------------------------------------

export const defaultProps: TestimonialProps = {
  quote: "This product completely transformed how we work. Our team saves hours every week.",
  customerName: "Jane Doe",
  customerTitle: "Head of Operations",
  customerCompany: "Acme Corp",
  customerImage: undefined,
  companyLogo: undefined,
  music: undefined,
  duration: 15,
};

export const calculateMetadata = ({
  props,
}: {
  props: TestimonialProps;
}) => {
  const dur = props.duration ?? 15;
  return {
    durationInFrames: dur * 30,
    fps: 30,
    width: 1920,
    height: 1080,
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Testimonial: React.FC<TestimonialProps> = ({
  quote,
  customerName,
  customerTitle,
  customerCompany,
  customerImage,
  companyLogo,
  brandKit: brandKitProp,
  music,
  duration = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrandKit(brandKitProp);
  const customerImgSrc = useAsset(customerImage);
  const companyLogoSrc = useAsset(companyLogo);
  const musicSrc = useAsset(music);
  const logoSrc = brandAsset(brand.logo.primary);

  // Word-by-word quote timing
  const wordCount = quote.split(" ").length;
  const quoteEnterFrame = 15;
  // ~3 frames per word + 8 frames fade each = done around quoteEnterFrame + wordCount * 3 + 8
  const quoteEndApprox = quoteEnterFrame + wordCount * 3 + 20;

  // Photo and attribution enter after quote completes
  const attributionEnter = quoteEndApprox;

  // Customer photo opacity
  const photoOpacity = interpolate(
    frame,
    [attributionEnter, attributionEnter + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  // Company logo opacity
  const companyLogoOpacity = companyLogoSrc
    ? interpolate(
        frame,
        [attributionEnter + 10, attributionEnter + 25],
        [0, 1],
        { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.colors.secondary}, ${brand.colors.background})`,
      }}
    >
      {/* ---- Background music ---- */}
      {musicSrc && <Audio src={musicSrc} volume={0.25} />}

      {/* ---- Decorative quote marks ---- */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          fontSize: 250,
          fontFamily: "Georgia, serif",
          color: brand.colors.accent,
          opacity: 0.12,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </div>

      {/* ---- Quote text (word-by-word) ---- */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          left: "12%",
          right: "12%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <TextOverlay
          text={quote}
          fontSize={44}
          color="#FFFFFF"
          animationType="word-by-word"
          enterFrame={quoteEnterFrame}
          bold
        />
      </div>

      {/* ---- Customer photo ---- */}
      {customerImgSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: photoOpacity,
          }}
        >
          <Img
            src={customerImgSrc}
            style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${brand.colors.accent}`,
            }}
          />
        </div>
      )}

      {/* ---- Customer attribution (LowerThird) ---- */}
      <LowerThird
        name={customerName}
        title={customerCompany ? `${customerTitle}, ${customerCompany}` : customerTitle}
        backgroundColor={brand.colors.primary}
        textColor={brand.colors.text}
        enterFrame={attributionEnter}
      />

      {/* ---- Company logo ---- */}
      {companyLogoSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 340,
            opacity: companyLogoOpacity,
          }}
        >
          <Img src={companyLogoSrc} style={{ height: 36, width: "auto" }} />
        </div>
      )}

      {/* ---- Brand logo (top-right) ---- */}
      <Logo src={logoSrc} position="top-right" width={100} enterFrame={0} />

      {/* ---- Progress bar ---- */}
      <ProgressBar color={brand.colors.accent} />
    </AbsoluteFill>
  );
};
