import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { Tick, TradeResult, MarketAnalysis } from '../types';

interface LiveChartProps {
  ticks: Tick[];
  trades: TradeResult[];
  analysis: MarketAnalysis | null;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-item">
        <span style={{ color: '#38bdf8' }}>Price: </span>
        <strong>{payload[0]?.value?.toFixed(4)}</strong>
      </div>
      {payload[1]?.value && (
        <div className="tooltip-item">
          <span style={{ color: '#a78bfa' }}>SMA-5: </span>
          <strong>{payload[1].value.toFixed(4)}</strong>
        </div>
      )}
      {payload[2]?.value && (
        <div className="tooltip-item">
          <span style={{ color: '#f59e0b' }}>SMA-20: </span>
          <strong>{payload[2].value.toFixed(4)}</strong>
        </div>
      )}
    </div>
  );
};

function computeSMA(ticks: Tick[], period: number): (number | null)[] {
  return ticks.map((_, i) => {
    if (i < period - 1) return null;
    const slice = ticks.slice(i - period + 1, i + 1);
    return slice.reduce((s, t) => s + t.quote, 0) / period;
  });
}

export default function LiveChart({ ticks, trades, analysis }: LiveChartProps) {
  const display = ticks.slice(-100);
  const sma5 = computeSMA(display, 5);
  const sma20 = computeSMA(display, 20);

  const chartData = display.map((t, i) => ({
    time: new Date(t.epoch * 1000).toLocaleTimeString(),
    price: t.quote,
    sma5: sma5[i],
    sma20: sma20[i],
  }));

  const prices = display.map(t => t.quote);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const padding = (maxPrice - minPrice) * 0.1 || 0.001;

  const lastWonTrade = trades.find(t => t.status === 'won');
  const lastLostTrade = trades.find(t => t.status === 'lost');

  return (
    <div className="card chart-card">
      <div className="card-header">
        <span className="card-icon">📈</span>
        <h2 className="card-title">Live Market Chart</h2>
        {analysis && (
          <div className={`direction-badge direction-badge--${analysis.direction.toLowerCase()}`}>
            {analysis.direction === 'CALL' ? '▲ RISE' : '▼ FALL'}
          </div>
        )}
        <div className="chart-legend">
          <span className="legend-dot" style={{ background: '#38bdf8' }} /> Price
          <span className="legend-dot" style={{ background: '#a78bfa' }} /> SMA-5
          <span className="legend-dot" style={{ background: '#f59e0b' }} /> SMA-20
        </div>
      </div>

      {ticks.length === 0 ? (
        <div className="chart-empty">
          <div className="chart-empty-icon">📡</div>
          <div>Waiting for market data…</div>
          <div className="chart-empty-sub">Connect and subscribe to a symbol to see live ticks</div>
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[minPrice - padding, maxPrice + padding]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(2)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#38bdf8' }}
              />
              <Line
                type="monotone"
                dataKey="sma5"
                stroke="#a78bfa"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="6 3"
              />
              {lastWonTrade && (
                <ReferenceLine y={lastWonTrade.entryTick} stroke="#10b981" strokeDasharray="3 3" label={{ value: '✓ Win', fill: '#10b981', fontSize: 10 }} />
              )}
              {lastLostTrade && (
                <ReferenceLine y={lastLostTrade.entryTick} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '✗ Loss', fill: '#ef4444', fontSize: 10 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Current price strip */}
      {ticks.length > 0 && (
        <div className="price-strip">
          <span className="price-current">{ticks[ticks.length - 1]?.quote.toFixed(4)}</span>
          <span className="price-label">Current Price</span>
          <span className="tick-count">{ticks.length} ticks received</span>
        </div>
      )}
    </div>
  );
}
