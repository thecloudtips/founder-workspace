/**
 * Convert seconds to frames at a given fps.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Convert frames to seconds at a given fps.
 */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/**
 * Calculate total duration in frames from an array of per-slide durations.
 */
export function totalFrames(
  slideDurations: number[],
  fps: number,
  transitionOverlapFrames: number = 0,
): number {
  const totalSlideFrames = slideDurations.reduce(
    (sum, d) => sum + secondsToFrames(d, fps),
    0,
  );
  const overlapReduction =
    Math.max(0, slideDurations.length - 1) * transitionOverlapFrames;
  return totalSlideFrames - overlapReduction;
}

/**
 * Get the start frame for slide N, accounting for transition overlaps.
 */
export function slideStartFrame(
  slideIndex: number,
  durationPerSlide: number,
  fps: number,
  transitionOverlapFrames: number = 0,
): number {
  const framesPerSlide = secondsToFrames(durationPerSlide, fps);
  return slideIndex * (framesPerSlide - transitionOverlapFrames);
}
