import type { Tick, MarketAnalysis } from '../types';

// ─── Market Analyzer ──────────────────────────────────────────────────────────
// Uses SMA crossover + volatility to determine trade direction and settings.

const TICK_BUFFER_SIZE = 100;
const SMA_SHORT = 5;
const SMA_LONG = 20;

export class MarketAnalyzer {
  private ticks: Tick[] = [];

  addTick(tick: Tick): void {
    this.ticks.push(tick);
    if (this.ticks.length > TICK_BUFFER_SIZE) {
      this.ticks.shift();
    }
  }

  get tickCount(): number {
    return this.ticks.length;
  }

  get latestPrice(): number {
    return this.ticks[this.ticks.length - 1]?.quote ?? 0;
  }

  getRecentTicks(count: number): Tick[] {
    return this.ticks.slice(-count);
  }

  // ─── SMA Calculation ──────────────────────────────────────────────────────

  private sma(period: number): number {
    if (this.ticks.length < period) return 0;
    const slice = this.ticks.slice(-period);
    return slice.reduce((sum, t) => sum + t.quote, 0) / period;
  }

  // ─── Volatility (Std Dev of price changes) ────────────────────────────────

  private volatility(): number {
    if (this.ticks.length < 10) return 0;
    const slice = this.ticks.slice(-20);
    const diffs = slice.slice(1).map((t, i) => t.quote - slice[i].quote);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
    return Math.sqrt(variance);
  }

  // ─── Momentum Score (-1 to +1) ────────────────────────────────────────────

  private momentum(): number {
    if (this.ticks.length < 10) return 0;
    const recent = this.ticks.slice(-10);
    let ups = 0;
    let downs = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].quote > recent[i - 1].quote) ups++;
      else if (recent[i].quote < recent[i - 1].quote) downs++;
    }
    return (ups - downs) / (recent.length - 1);
  }

  // ─── Main Analysis ────────────────────────────────────────────────────────

  analyze(): MarketAnalysis {
    const sma5 = this.sma(SMA_SHORT);
    const sma20 = this.sma(SMA_LONG);
    const vol = this.volatility();
    const mom = this.momentum();

    // Trend direction based on SMA crossover + momentum
    const smaBias = sma5 > sma20 ? 1 : sma5 < sma20 ? -1 : 0;
    const combinedSignal = smaBias * 0.6 + mom * 0.4;

    let direction: 'CALL' | 'PUT' = combinedSignal >= 0 ? 'CALL' : 'PUT';
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    if (combinedSignal > 0.2) trend = 'bullish';
    else if (combinedSignal < -0.2) trend = 'bearish';

    const confidence = Math.min(Math.abs(combinedSignal) * 100, 95);

    // Recommended duration: lower volatility = longer duration
    const recommendedDuration = vol < 0.01 ? 5 : vol < 0.05 ? 3 : 1;

    // Recommended stake: adjust by confidence
    const baseStake = 0.5;
    const recommendedStake = parseFloat((baseStake * (0.8 + confidence / 200)).toFixed(2));

    return {
      direction,
      confidence: parseFloat(confidence.toFixed(1)),
      volatility: parseFloat((vol * 100).toFixed(4)),
      trend,
      recommendedStake,
      recommendedDuration,
      sma5: parseFloat(sma5.toFixed(4)),
      sma20: parseFloat(sma20.toFixed(4)),
      lastUpdated: Date.now(),
    };
  }

  reset(): void {
    this.ticks = [];
  }
}
