# Logseq DB Favorite Tree

[中文说明](./README.zh-CN.md)

`Logseq DB Favorite Tree` is a Logseq plugin for `DB graph` that renders favorite pages as root nodes in a property-driven tree.

## Overview

- Uses favorite pages as tree roots
- Uses the page property `parent` to build hierarchy
- Provides a floating panel and collapsible bubble entry
- Designed for `DB graph` only and does not support `file graph`

## Features

- Loads favorite pages as root nodes automatically
- Resolves page hierarchy and supports lazy loading
- Highlights the current page and expands matching paths
- Supports in-tree search, breadcrumb navigation, and locate-current-page actions
- Supports panel dragging, resizing, bubble mode, and persisted layout state
- Supports manual refresh, auto-refresh control, and graph-scoped UI state
- Supports default title sorting and custom sibling drag sorting
- Follows the current Logseq UI language with English fallback

## Documentation

- [Chinese README](./README.zh-CN.md)
- [Feature List](./docs/feature-list.md)
- [Technical Design](./docs/technical-design.md)
- [User Guide](./docs/user-guide.en.md)
- [Chinese User Guide](./docs/user-guide.md)
- [Publish Guide](./docs/publish-guide.md)
- [Marketplace Manifest Example](./docs/marketplace-manifest.example.json)
- [Marketplace PR Template](./docs/marketplace-pr-template.md)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build the plugin

```bash
npm run build
```

### 3. Load into Logseq

1. Enable developer mode in Logseq
2. Choose `Load unpacked plugin`
3. Select this project directory
4. Click the toolbar icon to open the favorite tree

## Settings

- `Hierarchy property`: the property used to describe parent page relations, default is `parent`
- `Panel width`: default floating panel width in pixels
- `Auto-refresh interval (seconds)`: polling interval, default is `60`
- `Initial side preference`: first-open side placement preference

Notes:

- Auto-refresh is disabled by default
- When enabled, the default polling interval is `60` seconds and can be changed in settings

## Marketplace Notes

- GitHub repo: `https://github.com/yanhaizhe/logseq-db-favorite-tree`
- The release page should include a custom build zip asset
- The repository should include at least one screenshot or GIF before submission
- The plugin should be submitted as `supportsDB: true` and `supportsDBOnly: true`

## Code Structure

- `src/main.ts`: startup entry and plugin bootstrapping
- `src/plugin.ts`: orchestration layer for refresh, lifecycle, and UI state
- `src/tree-service.ts`: favorite roots, property normalization, and tree/path logic
- `src/floating-layout.ts`: panel and bubble layout, dragging, resizing, and snapping
- `src/render.ts`: pure HTML rendering for the panel and tree nodes
- `src/settings.ts`: plugin settings and graph-scoped internal state persistence
- `src/wire-dom-events.ts`: DOM event wiring and drag-sort binding
- `src/toolbar.ts`: Logseq toolbar registration
- `src/utils.ts`, `src/theme.ts`, `src/constants.ts`, `src/types.ts`: utilities, theme, constants, and types

## Development Notes

- The current implementation targets `DB graph` and explicitly marks `file graph` as unsupported in `package.json`
- Property parsing normalizes direct values, referenced page objects, and arrays to tolerate DB response differences
- The hierarchy property supports both literal `parent` and DB-internal property key shapes
- If the favorites API response varies, the plugin attempts to normalize it into page title lists
