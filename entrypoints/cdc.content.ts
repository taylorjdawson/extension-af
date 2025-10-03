import type { Message } from '@/types/messages';

export default defineContentScript({
  matches: ['*://*.cdc.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for CDC banner removal
    const selectors = [
      '.cdc-gs202510-banner',  // Current exact class from sample
      '[class^="cdc-gs"][class$="-banner"]'  // Future-proof for date-like class variants
    ];

    let isEnabled = true;
    let bannerWasRemoved = false;
    let observer: MutationObserver | null = null;

    // Check if extension is enabled
    async function checkEnabled() {
      const { enabled } = await browser.storage.local.get({ enabled: true });
      isEnabled = enabled;
      return enabled;
    }

    // Remove matching banner elements
    function removeBanners() {
      if (!isEnabled) return;

      let removed = false;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.remove();
          removed = true;
        });
      }

      if (removed && !bannerWasRemoved) {
        bannerWasRemoved = true;
        browser.runtime.sendMessage({ type: 'BANNER_REMOVED' } as Message);
        console.log('[gov-shutdown-ext] Removed CDC shutdown banner');
      }
    }

    // Start observing DOM changes
    function startObserver() {
      if (observer || !isEnabled) return;

      let debounceTimer: number;
      observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = ctx.setTimeout(() => {
          if (ctx.isValid) {
            removeBanners();
          }
        }, 200);
      });

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }

    // Stop observing DOM changes
    function stopObserver() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    // Listen for enable/disable changes from background
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.type === 'ENABLED_CHANGED') {
        isEnabled = message.enabled;
        if (isEnabled) {
          removeBanners();
          startObserver();
        } else {
          stopObserver();
        }
      }
    });

    // Initialize
    checkEnabled().then(enabled => {
      if (enabled) {
        removeBanners();
        startObserver();
      }
    });

    // Clean up on context invalidation (extension unload/update/navigation)
    ctx.onInvalidated(() => {
      stopObserver();
    });
  }
});
