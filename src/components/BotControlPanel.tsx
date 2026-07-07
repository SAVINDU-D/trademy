import type { BotSession, BotSettings, BotStatus } from '../types';

interface BotControlPanelProps {
  status: BotStatus;
  session: BotSession;
  settings: BotSettings;
  connected: boolean;
  winRate: number;
  onStart: () => void;
  onStop: () => void;
}

const STATUS_CONFIG: Record<BotStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'IDLE', color: '#6b7280', pulse: false },
  connecting: { label: 'CONNECTING', color: '#f59e0b', pulse: true },
  analyzing: { label: 'ANALYZING', color: '#8b5cf6', pulse: true },
  running: { label: 'RUNNING', color: '#10b981', pulse: true },
  stopped: { label: 'STOPPED', color: '#ef4444', pulse: false },
};

const STOP_REASON_LABELS: Record<string, string> = {
  profit_target: '🎯 Profit Target Reached!',
  loss_limit: '🛑 Loss Limit Reached',
  manual: '⏹ Manually Stopped',
};

export default function BotControlPanel({
  status, session, settings, connected, winRate, onStart, onStop
}: BotControlPanelProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const isRunning = status === 'running' || status === 'analyzing';
  const profitColor = session.totalProfit > 0 ? '#10b981' : session.totalProfit < 0 ? '#ef4444' : '#9ca3af';

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">🤖</span>
        <h2 className="card-title">Bot Control</h2>
        <div className="status-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
          <span
            className={`status-dot ${cfg.pulse ? 'status-dot--pulse' : ''}`}
            style={{ background: cfg.color }}
          />
          {cfg.label}
        </div>
      </div>

      {/* Stop Reason Banner */}
      {session.stopReason && (
        <div className={`stop-banner ${session.stopReason === 'profit_target' ? 'stop-banner--win' : 'stop-banner--loss'}`}>
          {STOP_REASON_LABELS[session.stopReason]}
          {session.stopReason !== 'manual' && (
            <span className="stop-banner-sub"> · Re-analyzing in 5s…</span>
          )}
        </div>
      )}

      {/* P&L Display */}
      <div className="pnl-row">
        <div className="pnl-main">
          <span className="pnl-label">Session P&L</span>
          <span className="pnl-value" style={{ color: profitColor }}>
            {session.totalProfit >= 0 ? '+' : ''}${session.totalProfit.toFixed(2)}
          </span>
        </div>
        <div className="pnl-targets">
          <div className="target-item target-item--profit">
            <span>Target</span>
            <span>+${settings.profitTarget.toFixed(2)}</span>
          </div>
          <div className="target-item target-item--loss">
            <span>Limit</span>
            <span>-${settings.lossLimit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{session.tradeCount}</span>
          <span className="stat-label">Trades</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: '#10b981' }}>{session.winCount}</span>
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: '#ef4444' }}>{session.lossCount}</span>
          <span className="stat-label">Losses</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: winRate >= 50 ? '#10b981' : '#ef4444' }}>
            {winRate}%
          </span>
          <span className="stat-label">Win Rate</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        {!isRunning ? (
          <button
            className="btn btn--start btn--full"
            onClick={onStart}
            disabled={!connected}
          >
            <span className="btn-inner">▶ Start Bot</span>
          </button>
        ) : (
          <button className="btn btn--stop btn--full" onClick={onStop}>
            <span className="btn-inner">⏹ Stop Bot</span>
          </button>
        )}
      </div>
    </div>
  );
}
