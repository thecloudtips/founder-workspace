import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface TextOverlayProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  enterFrame?: number;
  animationType?: "fade" | "slide-up" | "word-by-word";
  bold?: boolean;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  fontSize = 48,
  fontFamily = "Inter, sans-serif",
  color = "#FFFFFF",
  enterFrame = 0,
  animationType = "fade",
  bold = false,
}) => {
  const frame = useCurrentFrame();

  if (animationType === "word-by-word") {
    const words = text.split(" ");
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.3em",
          justifyContent: "center",
        }}
      >
        {words.map((word, i) => {
          const wordEnter = enterFrame + i * 3;
          const opacity = interpolate(
            frame,
            [wordEnter, wordEnter + 8],
            [0, 1],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
          );
          const translateY = interpolate(
            frame,
            [wordEnter, wordEnter + 8],
            [10, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
          );
          return (
            <span
              key={i}
              style={{
                fontSize,
                fontFamily,
                fontWeight: bold ? 700 : 400,
                color,
                opacity,
                transform: `translateY(${translateY}px)`,
                lineHeight: 1.3,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const translateY =
    animationType === "slide-up"
      ? interpolate(frame, [enterFrame, enterFrame + 15], [30, 0], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        })
      : 0;

  return (
    <div
      style={{
        fontSize,
        fontFamily,
        fontWeight: bold ? 700 : 400,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
};
