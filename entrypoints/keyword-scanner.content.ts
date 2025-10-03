export default defineContentScript({
  matches: ['<all_urls>'],
  // .gov domains are intentionally included so the scanner runs on government sites as well
  main() {
    // Function to scan DOM for target words and replace them
    function scanAndReplaceTargetWords() {
      // Get all text content from the page (used for logging only)
      const bodyText = document.body?.textContent || '';

      // Create case-insensitive regex patterns for "President", "Trump", and "POTUS"
      // Using word boundaries to avoid partial matches
      const presidentRegex = /\bpresident\b/gi;
      const trumpRegex = /\btrump\b/gi;
      const potusRegex = /\bpotus\b/gi;
      // Phrase-first regex: match multi-word combinations before single words to avoid double replacements
      // Matches examples:
      // - "President Trump"
      // - "President Donald Trump"
      // - "President Donald J. Trump"
      // - "Donald Trump", "Donald J. Trump"
      // Then falls back to single words: "President", "POTUS", "Trump"
      const phraseFirstRegex = new RegExp(
        '\\b(?:president|potus)\\s+(?:donald(?:\\s+(?:[A-Z]\\.|[A-Z][a-z]+)){0,2}\\s+)?trump\\b' +
          '|' +
          '\\bdonald(?:\\s+(?:[A-Z]\\.|[A-Z][a-z]+)){0,2}\\s+trump\\b' +
          '|' +
          '\\b(?:president|potus)\\b' +
          '|' +
          '\\btrump\\b',
        'gi'
      );

      // Find all matches (for logging)
      const presidentMatches = bodyText.match(presidentRegex) || [];
      const trumpMatches = bodyText.match(trumpRegex) || [];
      const potusMatches = bodyText.match(potusRegex) || [];

      // Replace occurrences in text nodes
      let nodesUpdated = 0;

      if (document.body) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        );
        let currentNode = walker.nextNode();
        while (currentNode) {
          const textNode = currentNode as Text;
          const parent = textNode.parentElement;
          if (parent) {
            const tagName = parent.tagName;
            if (
              tagName !== 'SCRIPT' &&
              tagName !== 'STYLE' &&
              tagName !== 'NOSCRIPT' &&
              tagName !== 'IFRAME' &&
              tagName !== 'CODE' &&
              tagName !== 'PRE' &&
              tagName !== 'TEXTAREA' &&
              tagName !== 'INPUT' &&
              !parent.isContentEditable
            ) {
              const original = textNode.nodeValue || '';
              const replaced = original.replace(phraseFirstRegex, 'The Führer');
              if (replaced !== original) {
                textNode.nodeValue = replaced;
                nodesUpdated++;
              }
            }
          }
          currentNode = walker.nextNode();
        }
      }

      // Check if we found any matches or updated any nodes
      const hasPresident = presidentMatches.length > 0;
      const hasTrump = trumpMatches.length > 0;
      const hasPOTUS = potusMatches.length > 0;

      if (hasPresident || hasTrump || hasPOTUS) {
        console.log(
          '🔄 Target words detected and replacements applied where found.'
        );

        if (hasPresident) {
          console.log(
            `Found "President": ${presidentMatches.length} occurrence(s)`
          );
        }
        if (hasTrump) {
          console.log(`Found "Trump": ${trumpMatches.length} occurrence(s)`);
        }
        if (hasPOTUS) {
          console.log(`Found "POTUS": ${potusMatches.length} occurrence(s)`);
        }

        // Log the page URL for reference
        console.log('Replaced with:', 'The Führer');
        console.log('Page URL:', window.location.href);
        console.log('Text nodes updated:', nodesUpdated);

        // Optional: Log a sample of surrounding text for context (omitted to reduce noise)
      } else {
        console.log('No target words found on this page.');
      }
    }

    // Run initial scan when page loads
    scanAndReplaceTargetWords();

    // Optional: Set up MutationObserver to detect dynamically added content
    const observer = new MutationObserver(() => {
      // Debounce to avoid excessive scanning
      clearTimeout((window as any).scanTimeout);
      (window as any).scanTimeout = setTimeout(() => {
        scanAndReplaceTargetWords();
      }, 1000);
    });

    // Start observing changes to the body
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  },
});
