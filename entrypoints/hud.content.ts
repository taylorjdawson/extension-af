export default defineContentScript({
  matches: ['*://*.hud.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for HUD banner and modal removal
    const selectors = [
      '.header-alert.whitebackboxplain',  // Alert banner from sample
      '.header-alert:has(.headeronei)',  // Header alert containing specific class
      '#openModal.modalDialog',  // Modal dialog with shutdown message
      '.modalDialog:has(.headerone)',  // Modal containing headerone class
      '.header-alert'  // Fallback: any header alert (check text content)
    ];

    // Remove matching banner elements
    function removeBanners() {
      let removed = false;
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // For generic .header-alert, check if it contains shutdown text
            if (selector === '.header-alert') {
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes('shut down') || text.includes('shutdown')) {
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
            if (selector.includes('.header-alert')) {
              const fallbackElements = document.querySelectorAll('.header-alert');
              fallbackElements.forEach(el => {
                if (el.querySelector('.headeronei')) {
                  el.remove();
                  removed = true;
                }
              });
            } else if (selector.includes('.modalDialog')) {
              const fallbackElements = document.querySelectorAll('.modalDialog');
              fallbackElements.forEach(el => {
                if (el.querySelector('.headerone')) {
                  el.remove();
                  removed = true;
                }
              });
            }
          }
        }
      }
      if (removed) {
        console.log('[gov-shutdown-ext] Removed HUD shutdown banner');
      }
    }

    // Initial removal on page load
    removeBanners();

    // Watch for dynamically inserted banners
    let debounceTimer: number;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = ctx.setTimeout(() => {
        if (ctx.isValid) {
          removeBanners();
        }
      }, 200);
    });

    // Start observing DOM changes
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // Clean up on context invalidation
    ctx.onInvalidated(() => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    });
  }
});