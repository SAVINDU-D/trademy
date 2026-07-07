// ─── Deriv API Types ──────────────────────────────────────────────────────────

export interface DerivConfig {
  appId: string;
  apiToken: string;
  symbol: string;
}

export interface Tick {
  epoch: number;
  quote: number;
  symbol: string;
}

export interface ContractProposal {
  id: string;
  askPrice: number;
  payout: number;
  contractType: 'CALL' | 'PUT';
  duration: number;
  symbol: string;
  stake: number;
}

export interface TradeResult {
  id: string;
  contractId: number;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  contractType: 'CALL' | 'PUT';
  symbol: string;
  entryTick: number;
  exitTick: number;
  entryTime: number;
  exitTime: number;
  status: 'won' | 'lost' | 'open';
}

// ─── Bot Types ────────────────────────────────────────────────────────────────

export type BotStatus = 'idle' | 'analyzing' | 'running' | 'stopped' | 'connecting';

export interface BotSettings {
  symbol: string;
  stake: number;
  duration: number;
  durationType: 't' | 'm';
  contractType: 'CALL' | 'PUT' | 'auto';
  profitTarget: number;
  lossLimit: number;
}

export interface BotSession {
  status: BotStatus;
  totalProfit: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  trades: TradeResult[];
  sessionStart: number | null;
  stopReason: 'profit_target' | 'loss_limit' | 'manual' | null;
}

// ─── Market Analysis Types ────────────────────────────────────────────────────

export interface MarketAnalysis {
  direction: 'CALL' | 'PUT';
  confidence: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  recommendedStake: number;
  recommendedDuration: number;
  sma5: number;
  sma20: number;
  lastUpdated: number;
}

// ─── Symbol Options ───────────────────────────────────────────────────────────

export interface SymbolOption {
  value: string;
  label: string;
  description: string;
}

export const SYMBOL_OPTIONS: SymbolOption[] = [
  { value: 'R_10', label: 'Volatility 10', description: 'Low volatility synthetic index' },
  { value: 'R_25', label: 'Volatility 25', description: 'Medium-low volatility synthetic index' },
  { value: 'R_50', label: 'Volatility 50', description: 'Medium volatility synthetic index' },
  { value: 'R_75', label: 'Volatility 75', description: 'High volatility synthetic index' },
  { value: 'R_100', label: 'Volatility 100', description: 'Highest volatility synthetic index' },
  { value: '1HZ10V', label: 'Vol 10 (1s)', description: '1-second ticks, 10% volatility' },
  { value: '1HZ100V', label: 'Vol 100 (1s)', description: '1-second ticks, 100% volatility' },
  { value: 'cryBTCUSD', label: 'Bitcoin / USD', description: 'Bitcoin cryptocurrency pair' },
  { value: 'cryETHUSD', label: 'Ethereum / USD', description: 'Ethereum cryptocurrency pair' },
  { value: 'cryLTCUSD', label: 'Litecoin / USD', description: 'Litecoin cryptocurrency pair' },
];
