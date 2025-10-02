export default defineContentScript({
  matches: ['*://*.treasury.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for Treasury banner removal
    const selectors = [
      '#block-hamilton-lapsealertbannerblock',  // Specific ID from sample
      '.usa-alert:has(a[href*="lapse-in-appropriations"])',  // Alert containing lapse link
      '.usa-alert:has(p:contains("shutdown"))'  // Fallback for shutdown text
    ];

    // Remove matching banner elements
    function removeBanners() {
      let removed = false;
      for (const selector of selectors) {
        try {
          // Note: :has() selector requires modern browser support
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.remove();
            removed = true;
          });
        } catch (e) {
          // Fallback for browsers without :has() support
          if (selector.includes(':has')) {
            const fallbackElements = document.querySelectorAll('.usa-alert');
            fallbackElements.forEach(el => {
              if (el.querySelector('a[href*="lapse-in-appropriations"]') ||
                  el.textContent?.toLowerCase().includes('shutdown')) {
                el.remove();
                removed = true;
              }
            });
          }
        }
      }
      if (removed) {
        console.log('[gov-shutdown-ext] Removed Treasury shutdown banner');
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