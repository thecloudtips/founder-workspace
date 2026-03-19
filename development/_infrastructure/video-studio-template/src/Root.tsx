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

export const Root: React.FC = () => {
  return (
    <>
      <Folder name="social">
        <Composition
          id="social-reel"
          component={SocialReel}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={450}
          defaultProps={defaultSocialReel}
          calculateMetadata={calcSocialReel}
        />
        <Composition
          id="social-quote"
          component={SocialQuote}
          width={1080}
          height={1080}
          fps={30}
          durationInFrames={240}
          defaultProps={defaultSocialQuote}
          calculateMetadata={calcSocialQuote}
        />
        <Composition
          id="social-listicle"
          component={SocialListicle}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultSocialListicle}
          calculateMetadata={calcSocialListicle}
        />
        <Composition
          id="social-before-after"
          component={SocialBeforeAfter}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={defaultSocialBeforeAfter}
          calculateMetadata={calcSocialBeforeAfter}
        />
      </Folder>
      <Folder name="marketing">
        <Composition
          id="product-demo"
          component={ProductDemo}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={900}
          defaultProps={defaultProductDemo}
          calculateMetadata={calcProductDemo}
        />
        <Composition
          id="testimonial"
          component={Testimonial}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={450}
          defaultProps={defaultTestimonial}
          calculateMetadata={calcTestimonial}
        />
        <Composition
          id="explainer"
          component={Explainer}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1350}
          defaultProps={defaultExplainer}
          calculateMetadata={calcExplainer}
        />
        <Composition
          id="pitch-highlight"
          component={PitchHighlight}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultPitchHighlight}
          calculateMetadata={calcPitchHighlight}
        />
      </Folder>
    </>
  );
};
