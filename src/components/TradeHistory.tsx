import type { TradeResult, BotSession } from '../types';

interface TradeHistoryProps {
  trades: TradeResult[];
  session: BotSession;
}

export default function TradeHistory({ trades, session }: TradeHistoryProps) {
  const totalPnL = session.totalProfit;
  const winRate = session.tradeCount > 0
    ? Math.round((session.winCount / session.tradeCount) * 100)
    : 0;

  return (
    <div className="history-container">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-icon">📊</span>
          <span className="summary-label">Total Trades</span>
          <span className="summary-value">{session.tradeCount}</span>
        </div>
        <div className="summary-card summary-card--win">
          <span className="summary-icon">✅</span>
          <span className="summary-label">Wins</span>
          <span className="summary-value" style={{ color: '#10b981' }}>{session.winCount}</span>
        </div>
        <div className="summary-card summary-card--loss">
          <span className="summary-icon">❌</span>
          <span className="summary-label">Losses</span>
          <span className="summary-value" style={{ color: '#ef4444' }}>{session.lossCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-icon">🎯</span>
          <span className="summary-label">Win Rate</span>
          <span className="summary-value" style={{ color: winRate >= 50 ? '#10b981' : '#ef4444' }}>
            {winRate}%
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-icon">💰</span>
          <span className="summary-label">Net P&L</span>
          <span className="summary-value" style={{ color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trade Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-icon">📋</span>
          <h2 className="card-title">Trade History</h2>
          <span className="history-count">{trades.length} trades</span>
        </div>

        {trades.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">📭</div>
            <div>No trades yet</div>
            <div className="history-empty-sub">Start the bot to begin trading</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Stake</th>
                  <th>Result</th>
                  <th>P&L</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className={`trade-row trade-row--${trade.status}`}>
                    <td className="td-time">
                      {new Date(trade.entryTime).toLocaleTimeString()}
                    </td>
                    <td className="td-symbol">{trade.symbol || '—'}</td>
                    <td>
                      <span className={`type-badge type-badge--${trade.contractType.toLowerCase()}`}>
                        {trade.contractType === 'CALL' ? '▲ CALL' : '▼ PUT'}
                      </span>
                    </td>
                    <td>${trade.buyPrice.toFixed(2)}</td>
                    <td>
                      {trade.status === 'open' ? (
                        <span className="status-open">⏳ Open</span>
                      ) : (
                        <span className={trade.status === 'won' ? 'status-won' : 'status-lost'}>
                          {trade.status === 'won' ? '✅ Won' : '❌ Lost'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: trade.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                        {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div className="status-pill-wrapper">
                        <span className={`status-pill status-pill--${trade.status}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
