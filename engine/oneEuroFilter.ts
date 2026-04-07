/**
 * One-Euro Adaptive Low-Pass Filter (Improved)
 * 
 * Adapts smoothing based on input speed:
 * - Slow/stationary → heavy smoothing → removes jitter
 * - Fast movement   → light smoothing → stays responsive
 * 
 * Tuning guide:
 *   minCutoff ↑  → less lag, more jitter
 *   beta      ↑  → faster reaction to speed changes
 *   dCutoff   ↑  → smoother derivative estimate
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev = 0;
  private dxPrev = 0;
  private tPrev = 0;
  private initialized = false;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(te: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * te;
    return r / (r + 1);
  }

  filter(value: number, timestamp: number): number {
    if (!this.initialized) {
      this.xPrev = value;
      this.dxPrev = 0;
      this.tPrev = timestamp;
      this.initialized = true;
      return value;
    }

    const te = timestamp - this.tPrev;
    if (te <= 0 || te > 1) {
      // Gap too large (>1s) — reinitialize to avoid stale derivative
      this.xPrev = value;
      this.dxPrev = 0;
      this.tPrev = timestamp;
      return value;
    }

    // Derivative (speed of change)
    const dx = (value - this.xPrev) / te;
    const aD = this.alpha(te, this.dCutoff);
    const dxSmooth = aD * dx + (1 - aD) * this.dxPrev;

    // Adaptive cutoff: faster movement → higher cutoff → less smoothing
    const cutoff = this.minCutoff + this.beta * Math.abs(dxSmooth);
    const a = this.alpha(te, cutoff);
    const filtered = a * value + (1 - a) * this.xPrev;

    this.xPrev = filtered;
    this.dxPrev = dxSmooth;
    this.tPrev = timestamp;
    return filtered;
  }

  reset(): void {
    this.initialized = false;
  }
}
