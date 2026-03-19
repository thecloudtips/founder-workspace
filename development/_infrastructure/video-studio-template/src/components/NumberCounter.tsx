import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export interface NumberCounterProps {
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  enterFrame?: number;
  durationFrames?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export const NumberCounter: React.FC<NumberCounterProps> = ({
  from = 0,
  to,
  prefix = "",
  suffix = "",
  enterFrame = 0,
  durationFrames = 30,
  fontSize = 72,
  color = "#FFFFFF",
  fontFamily = "Inter, sans-serif",
}) => {
  const frame = useCurrentFrame();

  const value = interpolate(
    frame,
    [enterFrame, enterFrame + durationFrames],
    [from, to],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + 8],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <div
      style={{
        fontSize,
        fontWeight: 700,
        fontFamily,
        color,
        opacity,
        textAlign: "center",
      }}
    >
      {prefix}
      {formatNumber(value)}
      {suffix}
    </div>
  );
};
