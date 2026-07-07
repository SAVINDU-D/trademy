import { DerivAPI } from './derivApi';
import { MarketAnalyzer } from './marketAnalyzer';
import type {
  DerivConfig,
  BotSettings,
  BotSession,
  BotStatus,
  Tick,
  TradeResult,
  MarketAnalysis,
} from '../types';

// ─── Event Types ──────────────────────────────────────────────────────────────

type BotEventMap = {
  tick: Tick;
  tradeResult: TradeResult;
  sessionUpdate: BotSession;
  statusChange: BotStatus;
  analysisUpdate: MarketAnalysis;
  error: string;
  balanceUpdate: number;
  settingsUpdate: BotSettings;
};

type BotEventListener<K extends keyof BotEventMap> = (data: BotEventMap[K]) => void;

// ─── Bot Engine ───────────────────────────────────────────────────────────────

export class BotEngine {
  private api: DerivAPI;
  private analyzer: MarketAnalyzer;
  private listeners: Map<string, BotEventListener<keyof BotEventMap>[]> = new Map();

  private session: BotSession = {
    status: 'idle',
    totalProfit: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    trades: [],
    sessionStart: null,
    stopReason: null,
  };

  private settings: BotSettings = {
    symbol: 'R_10',
    stake: 0.5,
    duration: 1,
    durationType: 'm',
    contractType: 'auto',
    profitTarget: 3.0,
    lossLimit: 1.5,
  };

  private isTrading = false;
  private tradeLoop: ReturnType<typeof setTimeout> | null = null;
  private analyzeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;

  constructor() {
    this.api = new DerivAPI();
    this.analyzer = new MarketAnalyzer();
    this.setupApiCallbacks();
  }

  // ─── Event System ──────────────────────────────────────────────────────────

  on<K extends keyof BotEventMap>(event: K, listener: BotEventListener<K>): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener as BotEventListener<keyof BotEventMap>);
    this.listeners.set(event, list);
  }

  off<K extends keyof BotEventMap>(event: K, listener: BotEventListener<K>): void {
    const list = this.listeners.get(event) ?? [];
    const filtered = list.filter(l => l !== listener);
    this.listeners.set(event, filtered);
  }

  private emit<K extends keyof BotEventMap>(event: K, data: BotEventMap[K]): void {
    const list = this.listeners.get(event) ?? [];
    list.forEach(l => (l as BotEventListener<K>)(data));
  }

  // ─── API Callbacks ─────────────────────────────────────────────────────────

  private setupApiCallbacks(): void {
    this.api.onTick = (tick) => {
      this.analyzer.addTick(tick);
      this.emit('tick', tick);

      // Emit live analysis every 5 ticks
      if (this.analyzer.tickCount % 5 === 0 && this.analyzer.tickCount >= 20) {
        const analysis = this.analyzer.analyze();
        this.emit('analysisUpdate', analysis);
      }
    };

    this.api.onTradeResult = (trade) => {
      this.session.tradeCount++;
      this.session.totalProfit += trade.profit;

      if (trade.status === 'won') this.session.winCount++;
      else if (trade.status === 'lost') this.session.lossCount++;

      this.session.trades = [trade, ...this.session.trades].slice(0, 100);
      this.emit('tradeResult', trade);
      this.emit('sessionUpdate', { ...this.session });

      // Check stop conditions
      if (this.isTrading) {
        if (this.session.totalProfit >= this.settings.profitTarget) {
          this.stopBot('profit_target');
        } else if (this.session.totalProfit <= -this.settings.lossLimit) {
          this.stopBot('loss_limit');
        } else {
          // Continue trading — schedule next trade
          this.scheduleNextTrade(2000);
        }
      }
    };

    this.api.onError = (error) => {
      this.emit('error', error);
      // On trade error, retry after delay
      if (this.isTrading) {
        this.scheduleNextTrade(3000);
      }
    };

    this.api.onStatusChange = (connected) => {
      this.isConnected = connected;
      if (!connected && this.isTrading) {
        this.isTrading = false;
        this.setStatus('stopped');
      }
    };

    this.api.onBalanceUpdate = (balance) => {
      this.emit('balanceUpdate', balance);
    };
  }

  // ─── Connect ───────────────────────────────────────────────────────────────

  async connect(config: DerivConfig): Promise<void> {
    this.setStatus('connecting');
    await this.api.connect(config);
    this.api.subscribeToTicks(this.settings.symbol);
    this.isConnected = true;
    this.setStatus('idle');
  }

  disconnect(): void {
    this.stopBot('manual');
    this.api.disconnect();
    this.isConnected = false;
  }

  // ─── Bot Control ───────────────────────────────────────────────────────────

  async startBot(): Promise<void> {
    if (!this.isConnected) {
      this.emit('error', 'Not connected to Deriv');
      return;
    }
    if (this.isTrading) return;
    
    if (this.analyzeTimeout) {
      clearTimeout(this.analyzeTimeout);
      this.analyzeTimeout = null;
    }

    // Reset session
    this.session = {
      status: 'running',
      totalProfit: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      trades: [],
      sessionStart: Date.now(),
      stopReason: null,
    };
    this.emit('sessionUpdate', { ...this.session });

    // Analyze first
    this.setStatus('analyzing');
    await this.runAnalysis();

    this.isTrading = true;
    this.setStatus('running');
    this.placeTrade();
  }

  stopBot(reason: BotSession['stopReason']): void {
    if (this.tradeLoop) {
      clearTimeout(this.tradeLoop);
      this.tradeLoop = null;
    }
    if (this.analyzeTimeout) {
      clearTimeout(this.analyzeTimeout);
      this.analyzeTimeout = null;
    }
    this.isTrading = false;
    this.session.stopReason = reason;
    this.setStatus('stopped');
    this.emit('sessionUpdate', { ...this.session });

    // Auto re-analyze and restart after stop
    if (reason === 'profit_target' || reason === 'loss_limit') {
      this.analyzeTimeout = setTimeout(() => {
        this.autoRestart();
      }, 5000);
    }
  }

  private async autoRestart(): Promise<void> {
    this.setStatus('analyzing');
    await this.runAnalysis();

    // Wait 3 more seconds then restart
    setTimeout(() => {
      if (this.isConnected) {
        this.startBot();
      }
    }, 3000);
  }

  // ─── Analysis ──────────────────────────────────────────────────────────────

  private async runAnalysis(): Promise<void> {
    return new Promise((resolve) => {
      // Need at least 20 ticks for meaningful analysis
      if (this.analyzer.tickCount >= 20) {
        const analysis = this.analyzer.analyze();
        this.emit('analysisUpdate', analysis);

        // Auto-update settings based on analysis
        if (this.settings.contractType === 'auto') {
          this.settings = {
            ...this.settings,
            stake: analysis.recommendedStake,
            duration: analysis.recommendedDuration,
          };
          this.emit('settingsUpdate', { ...this.settings });
        }
        resolve();
      } else {
        // Wait for enough ticks
        const waitForTicks = () => {
          if (this.analyzer.tickCount >= 20) {
            const analysis = this.analyzer.analyze();
            this.emit('analysisUpdate', analysis);
            if (this.settings.contractType === 'auto') {
              this.settings = {
                ...this.settings,
                stake: analysis.recommendedStake,
                duration: analysis.recommendedDuration,
              };
              this.emit('settingsUpdate', { ...this.settings });
            }
            resolve();
          } else {
            setTimeout(waitForTicks, 1000);
          }
        };
        waitForTicks();
      }
    });
  }

  // ─── Trade Execution ───────────────────────────────────────────────────────

  private async placeTrade(): Promise<void> {
    if (!this.isTrading || !this.isConnected) return;

    try {
      // Determine contract type
      let contractType: 'CALL' | 'PUT' = 'CALL';
      if (this.settings.contractType === 'auto') {
        const analysis = this.analyzer.analyze();
        contractType = analysis.direction;
      } else {
        contractType = this.settings.contractType as 'CALL' | 'PUT';
      }

      const proposal = await this.api.getProposal(
        this.settings.symbol,
        contractType,
        this.settings.stake,
        this.settings.duration,
        this.settings.durationType
      );

      if (!this.isTrading) return; // Stop was called while waiting for proposal

      const trade = await this.api.buyContract(proposal.id, proposal.askPrice);
      trade.contractType = contractType;
      this.emit('tradeResult', { ...trade }); // emit open trade

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      this.emit('error', msg);
      if (this.isTrading) {
        this.scheduleNextTrade(3000);
      }
    }
  }

  private scheduleNextTrade(delayMs: number): void {
    if (!this.isTrading) return;
    this.tradeLoop = setTimeout(() => {
      this.placeTrade();
    }, delayMs);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private setStatus(status: BotStatus): void {
    this.session.status = status;
    this.emit('statusChange', status);
  }

  updateSettings(partial: Partial<BotSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.emit('settingsUpdate', { ...this.settings });

    // Re-subscribe ticks if symbol changed
    if (partial.symbol && this.isConnected) {
      this.api.unsubscribeFromTicks(this.settings.symbol);
      this.api.subscribeToTicks(partial.symbol);
    }
  }

  getSettings(): BotSettings {
    return { ...this.settings };
  }

  getSession(): BotSession {
    return { ...this.session };
  }

  getAnalyzerTickCount(): number {
    return this.analyzer.tickCount;
  }
}
