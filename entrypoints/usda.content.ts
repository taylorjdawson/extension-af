import type { Message } from '@/types/messages';

export default defineContentScript({
  matches: ['*://*.usda.gov/*', '*://fs.usda.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for USDA/Forest Service banner removal
    const selectors = [
      '#block-fshqalertmessage',  // Specific block ID from sample
      '.alert-banner:has(.usa-alert--warning)',  // Alert banner with warning
      '.usa-alert--warning:has(span[data-teams])',  // Warning with teams span
      '.usa-alert--warning'  // Fallback: check text content
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
            // For generic warnings, check if it contains shutdown text
            if (selector === '.usa-alert--warning') {
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes('shutdown') || text.includes('funding lapse')) {
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
            if (selector.includes('.alert-banner')) {
              const fallbackElements = document.querySelectorAll('.alert-banner');
              fallbackElements.forEach(el => {
                if (el.querySelector('.usa-alert--warning')) {
                  el.remove();
                  removed = true;
                }
              });
            } else if (selector.includes('.usa-alert--warning')) {
              const fallbackElements = document.querySelectorAll('.usa-alert--warning');
              fallbackElements.forEach(el => {
                if (el.querySelector('span[data-teams]')) {
                  el.remove();
                  removed = true;
                }
              });
            }
          }
        }
      }

      if (removed && !bannerWasRemoved) {
        bannerWasRemoved = true;
        browser.runtime.sendMessage({ type: 'BANNER_REMOVED' } as Message);
        console.log('[gov-shutdown-ext] Removed USDA shutdown banner');
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