import { useState, useEffect } from 'react';
import type { StateResponse } from '@/types/messages';
import './App.css';

function App() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tabId = tabs[0]?.id;

        // Read global enabled from local storage
        const { enabled = true } = await browser.storage.local.get({
          enabled: true,
        });

        // Read per-tab removal flag from session storage
        let removedForTab = false;
        if (tabId !== undefined) {
          const key = `removed:${tabId}`;
          const session =
            (browser.storage as any).session ?? browser.storage.local;
          const result = await session.get(key);
          removedForTab = Boolean(result[key]);

          // One-shot retry in case write just happened
          if (!removedForTab) {
            await new Promise((r) => setTimeout(r, 75));
            const retry = await session.get(key);
            removedForTab = Boolean(retry[key]);
          }
        }

        const computed: StateResponse = { enabled, removedForTab };
        if (isMounted) setState(computed);
      } catch (err) {
        console.error('[extension-af][popup] Error during init:', err);
        if (isMounted) setState({ enabled: true, removedForTab: false });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async () => {
    if (!state) return;

    const newEnabled = !state.enabled;
    setState({ ...state, enabled: newEnabled });

    await browser.runtime.sendMessage({
      type: 'SET_ENABLED',
      enabled: newEnabled,
    });
  };

  if (loading || !state) {
    return <div className="popup">Loading...</div>;
  }

  return (
    <div className="popup">
      <div className="header">
        <h2>Government Shutdown Banner Blocker</h2>
      </div>

      <div className={`status ${state.removedForTab ? 'removed' : 'clean'}`}>
        {state.removedForTab
          ? '🚫 Removed fascist banner'
          : '👍 No fascist banners here!'}
      </div>

      <div className="toggle-container">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={handleToggle}
            className="toggle-input"
          />
          <span className="toggle-text">
            {state.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>
    </div>
  );
}

export default App;
