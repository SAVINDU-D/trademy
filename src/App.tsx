import { useState, useEffect, useRef, useCallback } from 'react';
import { BotEngine } from './engine/botEngine';
import type {
  BotSession,
  BotSettings,
  BotStatus,
  Tick,
  MarketAnalysis,
} from './types';
import ConnectionPanel from './components/ConnectionPanel';
import BotControlPanel from './components/BotControlPanel';
import LiveChart from './components/LiveChart';
import TradeHistory from './components/TradeHistory';
import MarketAnalysisPanel from './components/MarketAnalysis';
import BotSettingsPanel from './components/BotSettings';
import PnLGauge from './components/PnLGauge';

// ─── App ─────────────────────────────────────────────────────────────────────

const engine = new BotEngine();

function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<BotStatus>('idle');
  const [session, setSession] = useState<BotSession>(engine.getSession());
  const [settings, setSettings] = useState<BotSettings>(engine.getSettings());
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'history'>('dashboard');
  const ticksRef = useRef<Tick[]>([]);

  // ─── Engine Event Listeners ───────────────────────────────────────────────

  useEffect(() => {
    const handleTick = (tick: Tick) => {
      ticksRef.current = [...ticksRef.current, tick].slice(-150);
      setTicks([...ticksRef.current]);
    };
    const handleSession = (s: BotSession) => setSession({ ...s });
    const handleStatus = (s: BotStatus) => {
      setStatus(s);
      if (s === 'connecting') setConnecting(true);
      else setConnecting(false);
    };
    const handleAnalysis = (a: MarketAnalysis) => setAnalysis({ ...a });
    const handleBalance = (b: number) => setBalance(b);
    const handleError = (e: string) => {
      setErrors(prev => [e, ...prev].slice(0, 5));
      setTimeout(() => setErrors(prev => prev.filter(er => er !== e)), 5000);
    };
    const handleSettingsUpdate = (s: BotSettings) => setSettings({ ...s });

    engine.on('tick', handleTick);
    engine.on('sessionUpdate', handleSession);
    engine.on('statusChange', handleStatus);
    engine.on('analysisUpdate', handleAnalysis);
    engine.on('balanceUpdate', handleBalance);
    engine.on('error', handleError);
    engine.on('settingsUpdate', handleSettingsUpdate);

    return () => {
      engine.off('tick', handleTick);
      engine.off('sessionUpdate', handleSession);
      engine.off('statusChange', handleStatus);
      engine.off('analysisUpdate', handleAnalysis);
      engine.off('balanceUpdate', handleBalance);
      engine.off('error', handleError);
      engine.off('settingsUpdate', handleSettingsUpdate);
    };
  }, []);

  // ─── Connection Handlers ──────────────────────────────────────────────────

  const handleConnect = useCallback(async (appId: string, apiToken: string, symbol: string) => {
    setConnecting(true);
    setErrors([]);
    try {
      engine.updateSettings({ symbol });
      await engine.connect({ appId, apiToken, symbol });
      setConnected(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setErrors([msg]);
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    engine.disconnect();
    setConnected(false);
    setStatus('idle');
    ticksRef.current = [];
    setTicks([]);
    setBalance(null);
    setAnalysis(null);
  }, []);

  const handleStartBot = useCallback(() => engine.startBot(), []);
  const handleStopBot = useCallback(() => engine.stopBot('manual'), []);

  const handleSettingsChange = useCallback((partial: Partial<BotSettings>) => {
    engine.updateSettings(partial);
    setSettings(engine.getSettings());
  }, []);

  // ─── Win Rate ─────────────────────────────────────────────────────────────

  const winRate = session.tradeCount > 0
    ? Math.round((session.winCount / session.tradeCount) * 100)
    : 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">
              <span className="logo-name">DerivBot</span>
              <span className="logo-tag">Auto Trading</span>
            </div>
          </div>
        </div>
        <div className="header-center">
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >Dashboard</button>
            <button
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >Settings</button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >History</button>
          </nav>
        </div>
        <div className="header-right">
          {balance !== null && (
            <div className="balance-badge">
              <span className="balance-label">Balance</span>
              <span className="balance-value">${balance.toFixed(2)}</span>
            </div>
          )}
          <div className={`conn-badge ${connected ? 'conn-badge--online' : 'conn-badge--offline'}`}>
            <span className="conn-dot" />
            {connected ? 'Connected' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Error Toasts */}
      <div className="toast-container">
        {errors.map((e, i) => (
          <div key={i} className="toast toast--error">⚠ {e}</div>
        ))}
      </div>

      {/* Main Layout */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left Column */}
            <div className="col-left">
              <ConnectionPanel
                connected={connected}
                connecting={connecting}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
              <BotControlPanel
                status={status}
                session={session}
                settings={settings}
                connected={connected}
                winRate={winRate}
                onStart={handleStartBot}
                onStop={handleStopBot}
              />
              <PnLGauge
                profit={session.totalProfit}
                profitTarget={settings.profitTarget}
                lossLimit={settings.lossLimit}
              />
            </div>

            {/* Center Column */}
            <div className="col-center">
              <LiveChart ticks={ticks} trades={session.trades} analysis={analysis} />
              <MarketAnalysisPanel analysis={analysis} tickCount={engine.getAnalyzerTickCount()} />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-page">
            <BotSettingsPanel settings={settings} onUpdate={handleSettingsChange} disabled={status === 'running'} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-page">
            <TradeHistory trades={session.trades} session={session} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>⚠ Trading involves risk. Always test on a Demo account first.</span>
        <span>DerivBot v1.0 · Powered by Deriv WebSocket API</span>
      </footer>
    </div>
  );
}

export default App;
