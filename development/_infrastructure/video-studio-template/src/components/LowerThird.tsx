import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface LowerThirdProps {
  name: string;
  title: string;
  backgroundColor?: string;
  textColor?: string;
  enterFrame?: number;
  exitFrame?: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  backgroundColor = "#2563EB",
  textColor = "#FFFFFF",
  enterFrame = 0,
  exitFrame,
}) => {
  const frame = useCurrentFrame();

  const slideIn = interpolate(
    frame,
    [enterFrame, enterFrame + 20],
    [-300, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const slideOut = exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 15], [0, -300], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      })
    : 0;

  const translateX = slideIn + slideOut;

  const opacity = exitFrame
    ? interpolate(frame, [exitFrame, exitFrame + 15], [1, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      })
    : interpolate(frame, [enterFrame, enterFrame + 10], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor,
          padding: "16px 32px",
          borderRadius: "0 8px 8px 0",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: textColor,
            opacity: 0.85,
            lineHeight: 1.2,
            marginTop: 4,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};
