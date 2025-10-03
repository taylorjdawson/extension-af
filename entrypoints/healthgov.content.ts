import type { Message } from '@/types/messages';

export default defineContentScript({
  matches: ['*://*.health.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    const selectors = [
      '#block-oash-uswds-sitewidealert .usa-alert.usa-alert--error',
      '.region-alert .usa-alert',
      '.usa-alert',
    ];

    let isEnabled = true;
    let bannerWasRemoved = false;
    let observer: MutationObserver | null = null;

    async function checkEnabled() {
      const { enabled } = await browser.storage.local.get({ enabled: true });
      isEnabled = enabled;
      return enabled;
    }

    function containsShutdownText(el: Element): boolean {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('shutdown') || text.includes('shut down');
    }

    function removeBanners() {
      if (!isEnabled) return;
      let removed = false;
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (containsShutdownText(el)) {
              el.remove();
              removed = true;
            }
          });
        } catch (e) {}
      }
      if (removed && !bannerWasRemoved) {
        bannerWasRemoved = true;
        browser.runtime.sendMessage({ type: 'BANNER_REMOVED' } as Message);
        console.log('[gov-shutdown-ext] Removed Health.gov shutdown banner');
      }
    }

    function startObserver() {
      if (observer || !isEnabled) return;
      let debounceTimer: number;
      observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = ctx.setTimeout(() => {
          if (ctx.isValid) removeBanners();
        }, 200);
      });
      if (document.body)
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

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

    checkEnabled().then((enabled) => {
      if (enabled) {
        removeBanners();
        startObserver();
      }
    });

    ctx.onInvalidated(() => {
      stopObserver();
    });
  },
});
