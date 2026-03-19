import React from "react";
import { Composition, Folder } from "remotion";

import {
  SocialReel,
  calculateMetadata as calcSocialReel,
  defaultProps as defaultSocialReel,
} from "./templates/SocialReel";
import {
  SocialQuote,
  calculateMetadata as calcSocialQuote,
  defaultProps as defaultSocialQuote,
} from "./templates/SocialQuote";
import {
  SocialListicle,
  calculateMetadata as calcSocialListicle,
  defaultProps as defaultSocialListicle,
} from "./templates/SocialListicle";
import {
  SocialBeforeAfter,
  calculateMetadata as calcSocialBeforeAfter,
  defaultProps as defaultSocialBeforeAfter,
} from "./templates/SocialBeforeAfter";
import {
  ProductDemo,
  calculateMetadata as calcProductDemo,
  defaultProps as defaultProductDemo,
} from "./templates/ProductDemo";
import {
  Testimonial,
  calculateMetadata as calcTestimonial,
  defaultProps as defaultTestimonial,
} from "./templates/Testimonial";
import {
  Explainer,
  calculateMetadata as calcExplainer,
  defaultProps as defaultExplainer,
} from "./templates/Explainer";
import {
  PitchHighlight,
  calculateMetadata as calcPitchHighlight,
  defaultProps as defaultPitchHighlight,
} from "./templates/PitchHighlight";

// Type assertions needed because Remotion's Composition generics require Zod
// schemas for full type safety. Without schemas, we use `as any` — a standard
// pattern in Remotion projects that don't use zod prop validation.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const Root: React.FC = () => {
  return (
    <>
      <Folder name="social">
        <Composition
          id="social-reel"
          component={SocialReel as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={450}
          defaultProps={defaultSocialReel as any}
          calculateMetadata={calcSocialReel as any}
        />
        <Composition
          id="social-quote"
          component={SocialQuote as any}
          width={1080}
          height={1080}
          fps={30}
          durationInFrames={240}
          defaultProps={defaultSocialQuote as any}
          calculateMetadata={calcSocialQuote as any}
        />
        <Composition
          id="social-listicle"
          component={SocialListicle as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultSocialListicle as any}
          calculateMetadata={calcSocialListicle as any}
        />
        <Composition
          id="social-before-after"
          component={SocialBeforeAfter as any}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={defaultSocialBeforeAfter as any}
          calculateMetadata={calcSocialBeforeAfter as any}
        />
      </Folder>
      <Folder name="marketing">
        <Composition
          id="product-demo"
          component={ProductDemo as any}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={900}
          defaultProps={defaultProductDemo as any}
          calculateMetadata={calcProductDemo as any}
        />
        <Composition
          id="testimonial"
          component={Testimonial as any}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={450}
          defaultProps={defaultTestimonial as any}
          calculateMetadata={calcTestimonial as any}
        />
        <Composition
          id="explainer"
          component={Explainer as any}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1350}
          defaultProps={defaultExplainer as any}
          calculateMetadata={calcExplainer as any}
        />
        <Composition
          id="pitch-highlight"
          component={PitchHighlight as any}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultPitchHighlight as any}
          calculateMetadata={calcPitchHighlight as any}
        />
      </Folder>
    </>
  );
};
