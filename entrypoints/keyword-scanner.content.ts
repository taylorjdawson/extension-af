export default defineContentScript({
  matches: ['<all_urls>'],
  // .gov domains are intentionally included so the scanner runs on government sites as well
  main() {
    // Function to scan DOM for target words and replace them
    function scanAndReplaceTargetWords() {
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

      // Replace occurrences in text nodes

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
              }
            }
          }
          currentNode = walker.nextNode();
        }
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
