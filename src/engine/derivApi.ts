import type { DerivConfig, Tick, ContractProposal, TradeResult } from '../types';

// ─── Event Callbacks ──────────────────────────────────────────────────────────

type TickCallback = (tick: Tick) => void;
type TradeCallback = (trade: TradeResult) => void;
type ErrorCallback = (error: string) => void;
type StatusCallback = (connected: boolean) => void;
type BalanceCallback = (balance: number) => void;

// ─── Deriv API Engine ─────────────────────────────────────────────────────────

export class DerivAPI {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pendingProposals: Map<string, (proposal: ContractProposal) => void> = new Map();
  private pendingBuys: Map<string, (trade: TradeResult) => void> = new Map();
  private openContracts: Map<number, TradeResult> = new Map();
  private reqId = 1;

  // Callbacks
  public onTick: TickCallback | null = null;
  public onTradeResult: TradeCallback | null = null;
  public onError: ErrorCallback | null = null;
  public onStatusChange: StatusCallback | null = null;
  public onBalanceUpdate: BalanceCallback | null = null;

  private getReqId(): number {
    return this.reqId++;
  }

  // ─── Connect ────────────────────────────────────────────────────────────────

  connect(config: DerivConfig): Promise<void> {
    const primaryUrl = `wss://ws.derivws.com/websockets/v3?app_id=${config.appId}`;
    const fallbackUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${config.appId}`;

    return this.connectAttempt(config, primaryUrl)
      .catch((err) => {
        console.warn('Primary Deriv endpoint failed, trying fallback binaryws endpoint...', err);
        return this.connectAttempt(config, fallbackUrl);
      });
  }

  private connectAttempt(config: DerivConfig, wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      let lastErrorMessage = '';
      let isEstablished = false;

      this.ws.onopen = () => {
        this.authorize(config.apiToken)
          .then(() => {
            isEstablished = true;
            this.startPing();
            this.subscribeBalance();
            this.onStatusChange?.(true);
            resolve();
          })
          .catch((err) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            reject(new Error(errMsg));
          });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error && data.error.message) {
            lastErrorMessage = data.error.message;
          }
          this.handleMessage(data);
        } catch (e) {
          console.error('Parse error:', e);
        }
      };

      this.ws.onerror = () => {
        const msg = lastErrorMessage || 'WebSocket connection error. Please verify your API token and App ID, or check your internet connection.';
        if (isEstablished) {
          this.onError?.(msg);
        }
        reject(new Error(msg));
      };

      this.ws.onclose = (event) => {
        this.stopPing();
        this.onStatusChange?.(false);
        if (isEstablished && !event.wasClean) {
          const msg = lastErrorMessage || 'Connection lost unexpectedly. Please check your internet connection.';
          this.onError?.(msg);
        }
      };
    });
  }

  // ─── Disconnect ─────────────────────────────────────────────────────────────

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.openContracts.clear();
    this.pendingProposals.clear();
    this.pendingBuys.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Send Message ────────────────────────────────────────────────────────────

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  // ─── Authorize ───────────────────────────────────────────────────────────────

  private authorize(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const reqId = this.getReqId();
      const handler = (data: Record<string, unknown>) => {
        if ((data as Record<string, unknown>).req_id === reqId) {
          if ((data as Record<string, unknown>).error) {
            reject(new Error(((data as Record<string, unknown>).error as Record<string, string>).message));
          } else {
            resolve();
          }
        }
      };
      this.pendingProposals.set(`auth_${reqId}`, handler as unknown as (p: ContractProposal) => void);
      this.send({ authorize: token, req_id: reqId });
    });
  }

  // ─── Balance Subscription ────────────────────────────────────────────────────

  private subscribeBalance(): void {
    this.send({ balance: 1, subscribe: 1 });
  }

  // ─── Tick Subscription ───────────────────────────────────────────────────────

  subscribeToTicks(symbol: string): void {
    this.send({ ticks: symbol, subscribe: 1 });
  }

  unsubscribeFromTicks(symbol: string): void {
    this.send({ forget_all: 'ticks' });
    console.log('Unsubscribed from ticks for', symbol);
  }

  // ─── Get Proposal ────────────────────────────────────────────────────────────

  getProposal(
    symbol: string,
    contractType: 'CALL' | 'PUT',
    stake: number,
    duration: number,
    durationType: 't' | 'm'
  ): Promise<ContractProposal> {
    return new Promise((resolve, reject) => {
      const reqId = this.getReqId();
      const timeout = setTimeout(() => {
        this.pendingProposals.delete(`proposal_${reqId}`);
        reject(new Error('Proposal timeout'));
      }, 10000);

      this.pendingProposals.set(`proposal_${reqId}`, (proposal) => {
        clearTimeout(timeout);
        resolve(proposal);
      });

      this.send({
        proposal: 1,
        amount: stake,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration,
        duration_unit: durationType,
        symbol,
        req_id: reqId,
      });
    });
  }

  // ─── Buy Contract ────────────────────────────────────────────────────────────

  buyContract(proposalId: string, price: number): Promise<TradeResult> {
    return new Promise((resolve, reject) => {
      const reqId = this.getReqId();
      const timeout = setTimeout(() => {
        this.pendingBuys.delete(`buy_${reqId}`);
        reject(new Error('Buy timeout'));
      }, 10000);

      this.pendingBuys.set(`buy_${reqId}`, (trade) => {
        clearTimeout(timeout);
        resolve(trade);
      });

      this.send({ buy: proposalId, price, req_id: reqId });
    });
  }

  // ─── Message Handler ─────────────────────────────────────────────────────────

  private handleMessage(data: Record<string, unknown>): void {
    const msgType = data.msg_type as string;
    const reqId = data.req_id as number;

    // Auth response
    if (data[`auth_${reqId}`] !== undefined || msgType === 'authorize') {
      const handler = this.pendingProposals.get(`auth_${reqId}`);
      if (handler) {
        handler(data as unknown as ContractProposal);
        this.pendingProposals.delete(`auth_${reqId}`);
      }
      return;
    }

    switch (msgType) {
      case 'tick': {
        const tick = data.tick as Record<string, unknown>;
        if (tick && this.onTick) {
          this.onTick({
            epoch: tick.epoch as number,
            quote: parseFloat(tick.quote as string),
            symbol: tick.symbol as string,
          });
        }
        break;
      }

      case 'proposal': {
        const proposal = data.proposal as Record<string, unknown>;
        const handler = this.pendingProposals.get(`proposal_${reqId}`);
        if (handler && proposal) {
          handler({
            id: proposal.id as string,
            askPrice: parseFloat(proposal.ask_price as string),
            payout: parseFloat(proposal.payout as string),
            contractType: 'CALL',
            duration: 0,
            symbol: '',
            stake: 0,
          });
          this.pendingProposals.delete(`proposal_${reqId}`);
        }
        if ((data.error as Record<string, unknown>)?.code) {
          const err = data.error as Record<string, string>;
          this.onError?.(`Proposal error: ${err.message}`);
          this.pendingProposals.delete(`proposal_${reqId}`);
        }
        break;
      }

      case 'buy': {
        const buy = data.buy as Record<string, unknown>;
        const handler = this.pendingBuys.get(`buy_${reqId}`);
        if (handler && buy) {
          const contractId = buy.contract_id as number;
          const trade: TradeResult = {
            id: `trade_${contractId}`,
            contractId,
            buyPrice: parseFloat(buy.buy_price as string),
            sellPrice: 0,
            profit: 0,
            contractType: 'CALL',
            symbol: buy.underlying_symbol as string ?? '',
            entryTick: buy.start_time as number,
            exitTick: 0,
            entryTime: Date.now(),
            exitTime: 0,
            status: 'open',
          };
          this.openContracts.set(contractId, trade);
          handler(trade);
          this.pendingBuys.delete(`buy_${reqId}`);
          // Subscribe to contract updates
          this.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
        }
        if ((data.error as Record<string, unknown>)?.code) {
          const err = data.error as Record<string, string>;
          this.onError?.(`Buy error: ${err.message}`);
          this.pendingBuys.delete(`buy_${reqId}`);
        }
        break;
      }

      case 'proposal_open_contract': {
        const poc = data.proposal_open_contract as Record<string, unknown>;
        if (poc && poc.is_settleable) {
          const contractId = poc.contract_id as number;
          const existing = this.openContracts.get(contractId);
          if (existing) {
            const profit = parseFloat(poc.profit as string);
            const updated: TradeResult = {
              ...existing,
              sellPrice: parseFloat(poc.sell_price as string ?? '0'),
              profit,
              contractType: poc.contract_type === 'CALL' ? 'CALL' : 'PUT',
              exitTick: poc.exit_tick as number ?? 0,
              exitTime: Date.now(),
              status: profit >= 0 ? 'won' : 'lost',
            };
            this.openContracts.delete(contractId);
            this.onTradeResult?.(updated);
          }
        }
        break;
      }

      case 'balance': {
        const balance = data.balance as Record<string, unknown>;
        if (balance) {
          this.onBalanceUpdate?.(parseFloat(balance.balance as string));
        }
        break;
      }

      case 'error': {
        const err = data.error as Record<string, string>;
        this.onError?.(err?.message ?? 'Unknown API error');
        break;
      }
    }
  }

  // ─── Ping ────────────────────────────────────────────────────────────────────

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ ping: 1 });
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
