import type { Message } from '@/types/messages';

export default defineContentScript({
  matches: ['*://*.state.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for State.gov banner removal
    const selectors = [
      '#emergency_banner',  // Specific ID from sample
      '.module--header-alert',  // Module class for header alerts
      '.header-alert[data-component="headeralert"]',  // Header alert with component
      '.header-alert:has(.header-alert__title)'  // Header alert containing title
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
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // For header alerts, verify it contains shutdown-related text
            if (selector.includes('.header-alert')) {
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes('shutdown') || text.includes('federal government')) {
                el.remove();
                removed = true;
              }
            } else {
              el.remove();
              removed = true;
            }
          });
        } catch (e) {
          // Fallback for browsers without :has() support
          if (selector.includes(':has')) {
            const fallbackElements = document.querySelectorAll('.header-alert');
            fallbackElements.forEach(el => {
              if (el.querySelector('.header-alert__title')) {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes('shutdown')) {
                  el.remove();
                  removed = true;
                }
              }
            });
          }
        }
      }

      if (removed && !bannerWasRemoved) {
        bannerWasRemoved = true;
        browser.runtime.sendMessage({ type: 'BANNER_REMOVED' } as Message);
        console.log('[gov-shutdown-ext] Removed State.gov shutdown banner');
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

    // Clean up on context invalidation
    ctx.onInvalidated(() => {
      stopObserver();
    });
  }
});