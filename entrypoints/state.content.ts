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

    // Remove matching banner elements
    function removeBanners() {
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
      if (removed) {
        console.log('[gov-shutdown-ext] Removed State.gov shutdown banner');
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