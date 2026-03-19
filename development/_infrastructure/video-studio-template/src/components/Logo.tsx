import React from "react";
import { useCurrentFrame, interpolate, Img } from "remotion";

export interface LogoProps {
  src: string;
  width?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  enterFrame?: number;
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  "top-left": { top: 40, left: 40 },
  "top-right": { top: 40, right: 40 },
  "bottom-left": { bottom: 40, left: 40 },
  "bottom-right": { bottom: 40, right: 40 },
  center: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
};

export const Logo: React.FC<LogoProps> = ({
  src,
  width = 120,
  position = "bottom-right",
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [enterFrame, enterFrame + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const posStyle = POSITION_STYLES[position] ?? POSITION_STYLES["bottom-right"];

  return (
    <div
      style={{
        position: "absolute",
        opacity,
        ...posStyle,
      }}
    >
      <Img src={src} style={{ width, height: "auto" }} />
    </div>
  );
};
