import React from "react";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { springTiming } from "@remotion/transitions";
import type { TransitionType } from "../types";

export interface SlideTransitionProps {
  type?: TransitionType;
  durationInFrames?: number;
  children: React.ReactNode[];
  slideDurations: number[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(type: TransitionType): any {
  switch (type) {
    case "fade":
      return fade();
    case "slide":
      return slide();
    case "wipe":
      return wipe();
    case "flip":
      return flip();
    default:
      return fade();
  }
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  type = "fade",
  durationInFrames = 15,
  children,
  slideDurations,
}) => {
  const presentation = getPresentation(type);
  const timing = springTiming({ durationInFrames });

  return (
    <TransitionSeries>
      {React.Children.map(children, (child, index) => (
        <React.Fragment key={index}>
          <TransitionSeries.Sequence
            durationInFrames={slideDurations[index] ?? 90}
          >
            {child}
          </TransitionSeries.Sequence>
          {index < React.Children.count(children) - 1 && (
            <TransitionSeries.Transition
              presentation={presentation}
              timing={timing}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
