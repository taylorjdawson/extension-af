import type { Message } from '@/types/messages';

export default defineContentScript({
  matches: ['*://*.treasury.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for Treasury banner removal
    const selectors = [
      '#block-hamilton-lapsealertbannerblock', // Specific ID from sample
      '.usa-alert:has(a[href*="lapse-in-appropriations"])', // Alert containing lapse link
      '.usa-alert:has(p:contains("shutdown"))', // Fallback for shutdown text
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
          // Note: :has() selector requires modern browser support
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            el.remove();
            removed = true;
          });
        } catch (e) {
          // Fallback for browsers without :has() support
          if (selector.includes(':has')) {
            const fallbackElements = document.querySelectorAll('.usa-alert');
            fallbackElements.forEach((el) => {
              if (
                el.querySelector('a[href*="lapse-in-appropriations"]') ||
                el.textContent?.toLowerCase().includes('shutdown')
              ) {
                el.remove();
                removed = true;
              }
            });
          }
        }
      }

      if (removed && !bannerWasRemoved) {
        bannerWasRemoved = true;
        browser.runtime.sendMessage({ type: 'BANNER_REMOVED' } as Message);
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
          subtree: true,
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
    checkEnabled().then((enabled) => {
      if (enabled) {
        removeBanners();
        startObserver();
      }
    });

    // Clean up on context invalidation
    ctx.onInvalidated(() => {
      stopObserver();
    });
  },
});
