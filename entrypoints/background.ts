import type { Message, StateResponse } from '@/types/messages';

export default defineBackground(() => {
  // In-memory state: track which tabs had banners removed
  const lastRemovedByTab = new Map<number, boolean>();

  // Helpers to persist per-tab removal flags in session storage so they survive
  // background service worker restarts during the browser session.
  const removedKey = (tabId: number) => `removed:${tabId}`;

  async function setRemovedFlag(tabId: number, value: boolean): Promise<void> {
    const session = (browser.storage as any).session ?? browser.storage.local;
    if (value) {
      await session.set({ [removedKey(tabId)]: true });
    } else {
      await session.remove(removedKey(tabId));
    }
  }

  async function getRemovedFlag(tabId: number): Promise<boolean> {
    const session = (browser.storage as any).session ?? browser.storage.local;
    const result = await session.get(removedKey(tabId));
    return Boolean(result[removedKey(tabId)]);
  }

  // Initialize storage with default enabled state
  browser.storage.local.get({ enabled: true }).then(({ enabled }) => {
    console.log('[gov-shutdown-ext] Background initialized, enabled:', enabled);
  });

  // Handle messages from content scripts and popup
  browser.runtime.onMessage.addListener((message: Message, sender) => {
    switch (message.type) {
      case 'BANNER_REMOVED':
        if (sender.tab?.id) {
          lastRemovedByTab.set(sender.tab.id, true);
          // Persist to session storage to survive worker restarts
          setRemovedFlag(sender.tab.id, true);
          console.log(
            '[gov-shutdown-ext] Banner removed in tab',
            sender.tab.id
          );
        }
        break;

      case 'GET_STATE':
        return (async () => {
          const [{ enabled }, tabs] = await Promise.all([
            browser.storage.local.get({ enabled: true }),
            message.tabId !== undefined
              ? Promise.resolve([{ id: message.tabId }])
              : browser.tabs.query({ active: true, currentWindow: true }),
          ]);

          const activeTabId = message.tabId ?? tabs[0]?.id ?? -1;
          console.log(
            '[gov-shutdown-ext][bg] GET_STATE resolved tabId:',
            activeTabId
          );
          const removedForTab =
            activeTabId !== -1
              ? (await getRemovedFlag(activeTabId)) ||
                lastRemovedByTab.get(activeTabId) ||
                false
              : false;
          console.log(
            '[gov-shutdown-ext][bg] GET_STATE removedForTab:',
            removedForTab
          );

          const response: StateResponse = {
            enabled,
            removedForTab,
          };
          console.log('[gov-shutdown-ext][bg] GET_STATE response:', response);
          return response;
        })();

      case 'SET_ENABLED':
        return browser.storage.local
          .set({ enabled: message.enabled })
          .then(() => {
            // Broadcast to all tabs
            browser.tabs.query({}).then((tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  browser.tabs
                    .sendMessage(tab.id, {
                      type: 'ENABLED_CHANGED',
                      enabled: message.enabled,
                    })
                    .catch(() => {
                      // Tab may not have content script - this is fine
                    });
                }
              });
            });
            console.log(
              '[gov-shutdown-ext] Enabled state changed to:',
              message.enabled
            );
          });
    }
  });

  // Reset removal flag only on top-level navigations (changeInfo.url present)
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      lastRemovedByTab.set(tabId, false);
      setRemovedFlag(tabId, false);
    }
  });

  // Cleanup when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    lastRemovedByTab.delete(tabId);
    setRemovedFlag(tabId, false);
  });
});
