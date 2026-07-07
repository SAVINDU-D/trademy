interface PnLGaugeProps {
  profit: number;
  profitTarget: number;
  lossLimit: number;
}

export default function PnLGauge({ profit, profitTarget, lossLimit }: PnLGaugeProps) {
  // Map profit to -1..+1 range
  const total = profitTarget + lossLimit;
  const normalized = profit / total; // -lossLimit/total .. profitTarget/total
  const clamped = Math.max(-1, Math.min(1, normalized));

  // Arc from -135deg to +135deg (270deg total sweep)
  const SWEEP = 270;
  const startAngle = -135;
  const needleAngle = startAngle + ((clamped + 1) / 2) * SWEEP;

  // SVG arc path helper
  const polarToXY = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const cx = 100;
  const cy = 100;
  const r = 70;

  const arcPath = (from: number, to: number) => {
    const s = polarToXY(cx, cy, r, from);
    const e = polarToXY(cx, cy, r, to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const needle = polarToXY(cx, cy, 55, needleAngle);
  const profitColor = profit > 0 ? '#10b981' : profit < 0 ? '#ef4444' : '#6b7280';
  const profitPct = Math.min(Math.abs(profit) / (profit >= 0 ? profitTarget : lossLimit) * 100, 100);

  return (
    <div className="card pnl-gauge-card">
      <div className="card-header">
        <span className="card-icon">📊</span>
        <h2 className="card-title">P&L Gauge</h2>
      </div>
      <div className="gauge-wrapper">
        <svg viewBox="0 0 200 130" className="gauge-svg">
          {/* Background track */}
          <path
            d={arcPath(startAngle, startAngle + SWEEP)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Loss zone (left half) */}
          <path
            d={arcPath(startAngle, startAngle + SWEEP / 2)}
            fill="none"
            stroke="rgba(239,68,68,0.25)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Profit zone (right half) */}
          <path
            d={arcPath(startAngle + SWEEP / 2, startAngle + SWEEP)}
            fill="none"
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Active arc */}
          {profit !== 0 && (
            <path
              d={profit >= 0
                ? arcPath(startAngle + SWEEP / 2, needleAngle)
                : arcPath(needleAngle, startAngle + SWEEP / 2)
              }
              fill="none"
              stroke={profitColor}
              strokeWidth="12"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${profitColor})` }}
            />
          )}
          {/* Center point */}
          <circle cx={cx} cy={cy} r={4} fill="rgba(255,255,255,0.3)" />
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needle.x}
            y2={needle.y}
            stroke={profitColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 4px ${profitColor})`,
              transition: 'all 0.4s ease',
            }}
          />
          {/* Labels */}
          <text x="22" y="118" fill="#ef4444" fontSize="9" fontWeight="600" textAnchor="middle">
            -${lossLimit}
          </text>
          <text x="178" y="118" fill="#10b981" fontSize="9" fontWeight="600" textAnchor="middle">
            +${profitTarget}
          </text>
          <text x="100" y="108" fill="#9ca3af" fontSize="7.5" textAnchor="middle">LOSS</text>
          <text x="100" y="118" fill="#9ca3af" fontSize="7.5" textAnchor="middle">PROFIT</text>
        </svg>

        {/* Center value */}
        <div className="gauge-value-center">
          <span className="gauge-pnl" style={{ color: profitColor }}>
            {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
          </span>
          <span className="gauge-pct" style={{ color: profitColor }}>
            {profitPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
