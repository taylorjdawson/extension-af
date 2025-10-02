export default defineContentScript({
  matches: ['*://*.cdc.gov/*'],
  runAt: 'document_idle',
  main(ctx) {
    // Primary selectors for CDC banner removal
    const selectors = [
      '.cdc-gs202510-banner',  // Current exact class from sample
      '[class^="cdc-gs"][class$="-banner"]'  // Future-proof for date-like class variants
    ];

    // Remove matching banner elements
    function removeBanners() {
      let removed = false;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.remove();
          removed = true;
        });
      }
      if (removed) {
        console.log('[gov-shutdown-ext] Removed CDC shutdown banner');
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

    // Clean up on context invalidation (extension unload/update/navigation)
    ctx.onInvalidated(() => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    });
  }
});