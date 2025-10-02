# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser extension built with WXT framework and React. WXT is a modern web extension development framework that supports hot module replacement and TypeScript out of the box.

## Development Commands

```bash
# Start development server with hot reload (Chrome)
npm run dev

# Start development server for Firefox
npm run dev:firefox

# Build extension for production (Chrome)
npm run build

# Build extension for Firefox
npm run build:firefox

# Create ZIP file for distribution
npm run zip
npm run zip:firefox

# Type checking
npm run compile
```

## Architecture

### Core Components

- **WXT Framework**: The extension uses WXT for building and bundling. Configuration is in `wxt.config.ts`.
- **React Integration**: React components are used for the popup UI, configured via `@wxt-dev/module-react`.
- **TypeScript**: Full TypeScript support with configuration extending `.wxt/tsconfig.json`.

### Entry Points

The extension has three main entry points located in `entrypoints/`:

1. **background.ts**: Service worker that runs in the background
2. **content.ts**: Content script injected into matching web pages (currently configured for `*.google.com`)
3. **popup/**: React application for the extension popup
   - `main.tsx`: Entry point for React app
   - `App.tsx`: Main React component

### File Structure

- `/entrypoints/` - Extension entry points (background, content, popup)
- `/assets/` - Static assets used by React components
- `/public/` - Public assets (icons, SVGs) copied directly to output
- `/.output/` - Build output directory (auto-generated)
- `/.wxt/` - WXT generated types and configuration

### Build Output

The extension builds to `.output/chrome-mv3/` for Chrome (Manifest V3) and similar directories for other browsers. The manifest is auto-generated based on WXT configuration.

## Key Technical Details

- **Manifest Version**: V3 (modern Chrome extension format)
- **React Version**: 19.x with functional components and hooks
- **Hot Reload**: Enabled in development via WXT's HMR support
- **Content Script Matching**: Currently set to `*://*.google.com/*` in `entrypoints/content.ts`