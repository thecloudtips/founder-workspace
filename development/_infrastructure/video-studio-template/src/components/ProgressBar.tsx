import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export interface ProgressBarProps {
  color?: string;
  height?: number;
  position?: "top" | "bottom";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = "#2563EB",
  height = 4,
  position = "bottom",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = (frame / Math.max(durationInFrames - 1, 1)) * 100;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [position]: 0,
        height,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: color,
        }}
      />
    </div>
  );
};
