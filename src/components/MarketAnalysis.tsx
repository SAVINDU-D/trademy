import type { MarketAnalysis } from '../types';

interface MarketAnalysisPanelProps {
  analysis: MarketAnalysis | null;
  tickCount: number;
}

export default function MarketAnalysisPanel({ analysis, tickCount }: MarketAnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🧠</span>
          <h2 className="card-title">Market Analysis</h2>
        </div>
        <div className="analysis-loading">
          <div className="loading-bar-wrapper">
            <div className="loading-bar" style={{ width: `${Math.min((tickCount / 20) * 100, 100)}%` }} />
          </div>
          <span className="loading-label">
            Collecting ticks… ({tickCount}/20 needed)
          </span>
        </div>
      </div>
    );
  }

  const confidenceColor =
    analysis.confidence > 70 ? '#10b981' :
    analysis.confidence > 40 ? '#f59e0b' : '#ef4444';

  const trendIcon =
    analysis.trend === 'bullish' ? '📈' :
    analysis.trend === 'bearish' ? '📉' : '➡';

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">🧠</span>
        <h2 className="card-title">Market Analysis</h2>
        <span className="analysis-time">
          Updated {new Date(analysis.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="analysis-grid">
        {/* Direction */}
        <div className={`analysis-direction ${analysis.direction === 'CALL' ? 'analysis-direction--call' : 'analysis-direction--put'}`}>
          <div className="direction-arrow">{analysis.direction === 'CALL' ? '▲' : '▼'}</div>
          <div className="direction-label">{analysis.direction === 'CALL' ? 'RISE (CALL)' : 'FALL (PUT)'}</div>
          <div className="direction-trend">{trendIcon} {analysis.trend.toUpperCase()}</div>
        </div>

        {/* Confidence */}
        <div className="analysis-metric">
          <div className="metric-header">
            <span className="metric-label">Signal Confidence</span>
            <span className="metric-value" style={{ color: confidenceColor }}>{analysis.confidence}%</span>
          </div>
          <div className="metric-bar-track">
            <div
              className="metric-bar-fill"
              style={{
                width: `${analysis.confidence}%`,
                background: confidenceColor,
                boxShadow: `0 0 8px ${confidenceColor}`,
              }}
            />
          </div>
        </div>

        {/* Volatility */}
        <div className="analysis-metric">
          <div className="metric-header">
            <span className="metric-label">Market Volatility</span>
            <span className="metric-value">{analysis.volatility.toFixed(4)}</span>
          </div>
          <div className="metric-bar-track">
            <div
              className="metric-bar-fill"
              style={{
                width: `${Math.min(analysis.volatility * 1000, 100)}%`,
                background: '#a78bfa',
                boxShadow: '0 0 8px #a78bfa',
              }}
            />
          </div>
        </div>

        {/* SMA Values */}
        <div className="analysis-sma-row">
          <div className="sma-item">
            <span className="sma-dot" style={{ background: '#a78bfa' }} />
            <span className="sma-label">SMA-5</span>
            <span className="sma-value">{analysis.sma5}</span>
          </div>
          <div className={`sma-cross ${analysis.sma5 > analysis.sma20 ? 'sma-cross--bull' : 'sma-cross--bear'}`}>
            {analysis.sma5 > analysis.sma20 ? '↑ Bullish Cross' : '↓ Bearish Cross'}
          </div>
          <div className="sma-item">
            <span className="sma-dot" style={{ background: '#f59e0b' }} />
            <span className="sma-label">SMA-20</span>
            <span className="sma-value">{analysis.sma20}</span>
          </div>
        </div>

        {/* Recommended Settings */}
        <div className="analysis-reco">
          <h3 className="reco-title">🎯 Recommended Settings</h3>
          <div className="reco-grid">
            <div className="reco-item">
              <span className="reco-label">Contract</span>
              <span className="reco-value">{analysis.direction}</span>
            </div>
            <div className="reco-item">
              <span className="reco-label">Duration</span>
              <span className="reco-value">{analysis.recommendedDuration}m</span>
            </div>
            <div className="reco-item">
              <span className="reco-label">Stake</span>
              <span className="reco-value">${analysis.recommendedStake}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
