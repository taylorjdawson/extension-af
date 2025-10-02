export default defineContentScript({
  matches: ['<all_urls>'],
  exclude: [
    '*://*.gov/*',  // Exclude all .gov domains since we have specific scripts for them
  ],
  main() {
    // Function to scan DOM for shutdown-related keywords
    function scanForShutdownKeywords() {
      // Get all text content from the page
      const bodyText = document.body?.textContent || '';

      // Create case-insensitive regex patterns for "shut", "down", and "shutdown"
      // Using word boundaries to avoid partial matches
      const shutRegex = /\bshut\b/gi;
      const downRegex = /\bdown\b/gi;
      const shutdownRegex = /\bshutdown\b/gi;

      // Find all matches
      const shutMatches = bodyText.match(shutRegex) || [];
      const downMatches = bodyText.match(downRegex) || [];
      const shutdownMatches = bodyText.match(shutdownRegex) || [];

      // Check if we found any matches
      const hasShut = shutMatches.length > 0;
      const hasDown = downMatches.length > 0;
      const hasShutdown = shutdownMatches.length > 0;

      if (hasShut || hasDown || hasShutdown) {
        console.log('🚨 Shutdown keywords detected on this page!');

        if (hasShut) {
          console.log(`Found "shut": ${shutMatches.length} occurrence(s)`);
        }

        if (hasDown) {
          console.log(`Found "down": ${downMatches.length} occurrence(s)`);
        }

        if (hasShutdown) {
          console.log(`Found "shutdown": ${shutdownMatches.length} occurrence(s)`);
        }

        // Log the page URL for reference
        console.log('Page URL:', window.location.href);

        // Optional: Log a sample of surrounding text for context
        if (hasShut || hasDown) {
          // Find first occurrence for context
          const firstShutIndex = bodyText.toLowerCase().indexOf('shut');
          const firstDownIndex = bodyText.toLowerCase().indexOf('down');

          if (firstShutIndex !== -1) {
            const context = bodyText.substring(
              Math.max(0, firstShutIndex - 30),
              Math.min(bodyText.length, firstShutIndex + 30)
            );
            console.log('Context for "shut":', context.trim());
          }

          if (firstDownIndex !== -1) {
            const context = bodyText.substring(
              Math.max(0, firstDownIndex - 30),
              Math.min(bodyText.length, firstDownIndex + 30)
            );
            console.log('Context for "down":', context.trim());
          }
        }
      } else {
        console.log('No shutdown keywords found on this page.');
      }
    }

    // Run initial scan when page loads
    scanForShutdownKeywords();

    // Optional: Set up MutationObserver to detect dynamically added content
    const observer = new MutationObserver(() => {
      // Debounce to avoid excessive scanning
      clearTimeout((window as any).scanTimeout);
      (window as any).scanTimeout = setTimeout(() => {
        scanForShutdownKeywords();
      }, 1000);
    });

    // Start observing changes to the body
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  },
});
