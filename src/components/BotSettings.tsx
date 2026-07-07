import type { BotSettings } from '../types';
import { SYMBOL_OPTIONS } from '../types';

interface BotSettingsPanelProps {
  settings: BotSettings;
  onUpdate: (partial: Partial<BotSettings>) => void;
  disabled: boolean;
}

export default function BotSettingsPanel({ settings, onUpdate, disabled }: BotSettingsPanelProps) {
  return (
    <div className="settings-container">
      <div className="settings-header-row">
        <h2 className="settings-title">⚙️ Bot Settings</h2>
        {disabled && (
          <span className="settings-locked">🔒 Stop bot to edit settings</span>
        )}
      </div>

      <div className="settings-grid">
        {/* Market Settings */}
        <div className="card settings-card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <h3 className="card-title">Market</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Symbol</label>
            <select
              className="form-select"
              value={settings.symbol}
              disabled={disabled}
              onChange={e => onUpdate({ symbol: e.target.value })}
            >
              {SYMBOL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trade Settings */}
        <div className="card settings-card">
          <div className="card-header">
            <span className="card-icon">💱</span>
            <h3 className="card-title">Trade</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Contract Direction</label>
            <select
              className="form-select"
              value={settings.contractType}
              disabled={disabled}
              onChange={e => onUpdate({ contractType: e.target.value as BotSettings['contractType'] })}
            >
              <option value="auto">🤖 Auto (AI decides)</option>
              <option value="CALL">▲ Always CALL (Rise)</option>
              <option value="PUT">▼ Always PUT (Fall)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Stake per Trade: <strong>${settings.stake.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              className="form-range"
              min={0.35}
              max={10}
              step={0.05}
              value={settings.stake}
              disabled={disabled}
              onChange={e => onUpdate({ stake: parseFloat(e.target.value) })}
            />
            <div className="range-labels">
              <span>$0.35</span>
              <span>$10.00</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group--half">
              <label className="form-label">Duration</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={60}
                value={settings.duration}
                disabled={disabled}
                onChange={e => onUpdate({ duration: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group form-group--half">
              <label className="form-label">Unit</label>
              <select
                className="form-select"
                value={settings.durationType}
                disabled={disabled}
                onChange={e => onUpdate({ durationType: e.target.value as 't' | 'm' })}
              >
                <option value="t">Ticks</option>
                <option value="m">Minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="card settings-card">
          <div className="card-header">
            <span className="card-icon">🛡</span>
            <h3 className="card-title">Risk Management</h3>
          </div>

          <div className="form-group">
            <label className="form-label">
              Profit Target: <strong style={{ color: '#10b981' }}>+${settings.profitTarget.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              className="form-range range-profit"
              min={0.5}
              max={20}
              step={0.5}
              value={settings.profitTarget}
              disabled={disabled}
              onChange={e => onUpdate({ profitTarget: parseFloat(e.target.value) })}
            />
            <div className="range-labels">
              <span>$0.50</span>
              <span>$20.00</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Loss Limit: <strong style={{ color: '#ef4444' }}>-${settings.lossLimit.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              className="form-range range-loss"
              min={0.5}
              max={10}
              step={0.5}
              value={settings.lossLimit}
              disabled={disabled}
              onChange={e => onUpdate({ lossLimit: parseFloat(e.target.value) })}
            />
            <div className="range-labels">
              <span>$0.50</span>
              <span>$10.00</span>
            </div>
          </div>

          <div className="risk-summary">
            <div className="risk-row">
              <span>Max trades before loss limit:</span>
              <strong>{Math.floor(settings.lossLimit / settings.stake)} trades</strong>
            </div>
            <div className="risk-row">
              <span>Required wins for target:</span>
              <strong>~{Math.ceil(settings.profitTarget / (settings.stake * 0.8))} trades</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
