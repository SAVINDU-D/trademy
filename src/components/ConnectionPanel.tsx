import { useState } from 'react';
import { SYMBOL_OPTIONS } from '../types';

interface ConnectionPanelProps {
  connected: boolean;
  connecting: boolean;
  onConnect: (appId: string, apiToken: string, symbol: string) => void;
  onDisconnect: () => void;
}

export default function ConnectionPanel({ connected, connecting, onConnect, onDisconnect }: ConnectionPanelProps) {
  const [appId, setAppId] = useState('1089');
  const [apiToken, setApiToken] = useState('');
  const [symbol, setSymbol] = useState('R_10');
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiToken.trim()) return;
    onConnect(appId.trim(), apiToken.trim(), symbol);
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">🔌</span>
        <h2 className="card-title">API Connection</h2>
      </div>

      {!connected ? (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">App ID</label>
            <input
              className="form-input"
              type="text"
              value={appId}
              onChange={e => setAppId(e.target.value)}
              placeholder="e.g. 1089 (demo)"
            />
            <span className="form-hint">Use 1089 for demo · Get your own at developers.deriv.com</span>
          </div>

          <div className="form-group">
            <label className="form-label">API Token</label>
            <div className="input-with-toggle">
              <input
                className="form-input"
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="Paste your API token here"
                required
              />
              <button type="button" className="token-toggle" onClick={() => setShowToken(v => !v)}>
                {showToken ? '🙈' : '👁'}
              </button>
            </div>
            <span className="form-hint">Requires Read + Trade scopes from Deriv → Settings → API Token</span>
          </div>

          <div className="form-group">
            <label className="form-label">Market Symbol</label>
            <select className="form-select" value={symbol} onChange={e => setSymbol(e.target.value)}>
              {SYMBOL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={connecting || !apiToken.trim()}
          >
            {connecting ? (
              <span className="btn-inner"><span className="spinner" />Connecting…</span>
            ) : 'Connect to Deriv'}
          </button>
        </form>
      ) : (
        <div className="connected-state">
          <div className="connected-symbol">
            <span className="symbol-badge">
              {SYMBOL_OPTIONS.find(o => o.value === symbol)?.label ?? symbol}
            </span>
            <span className="symbol-value">{symbol}</span>
          </div>
          <button className="btn btn--danger btn--full" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
