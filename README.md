# Logseq DB Favorite Tree

[中文说明](./README.zh-CN.md)

`Logseq DB Favorite Tree` is a Logseq plugin for `DB graph` that renders favorite pages as root nodes in a property-driven tree.

## Overview

- Uses favorite pages as tree roots
- Uses the page property `parent` to build hierarchy
- Supports `sidebar`, `floating`, and `mixed` display modes
- Defaults to native sidebar mode, with optional floating panel switching
- Designed for `DB graph` only and does not support `file graph`

## Features

- Loads favorite pages as root nodes automatically
- Resolves page hierarchy and supports lazy loading
- Hides expand toggles on leaf nodes and keeps tree indentation clean
- Supports native sidebar rendering with search, locate-current-page, expand/collapse all, refresh, and settings
- Supports floating panel, floating bubble, and mixed switching behavior
- Supports in-tree search with ancestor-path retention and keyword highlighting
- Supports breadcrumb navigation and locate-current-page expansion across multiple matched paths
- Supports default title sorting and custom sibling drag sorting
- Remembers layout, expanded nodes, sorting, controls state, and display mode per graph
- Follows the current Logseq UI language with English fallback

## Install from Marketplace

1. Open `Marketplace` in Logseq
2. Search for `DB Favorite Tree`
3. Install and enable the plugin
4. Favorite at least one page to create root nodes
5. Add the `parent` property to child pages you want to organize in the tree

## Install from Source

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

## First-Time Setup

### 1. Prepare root pages

- Add one or more pages to Logseq favorites
- Favorited pages become the root nodes of the tree

### 2. Configure the hierarchy property

- The default hierarchy property is `parent`
- Add `parent` to a child page and set its value to another page
- The child page will then appear under that parent page

Example:

```text
Page: Weekly Plan
Property: parent
Value: [[Project Management]]
```

### 3. Multiple parents

- The `parent` property can contain multiple page references
- A page with multiple parents appears in multiple paths

## Display Modes

- `sidebar`: renders the tree in Logseq's native left sidebar only
- `floating`: uses the floating panel and bubble flow only
- `mixed`: allows switching between native sidebar and floating panel
- Default preset is `sidebar`
- In `mixed` mode, initialization still prefers `sidebar` first

## Everyday Workflow

- Open the tree from the toolbar icon
- Use native sidebar mode for always-on navigation
- Switch to the floating panel when you need dragging, resizing, or bubble mode
- Expand nodes to lazy-load child pages
- Use search to filter the tree and keep ancestor paths visible
- Use `Locate current page` to reveal the current page in all matching paths
- Drag sibling nodes to save a custom order when not searching

## Settings

- `Hierarchy property`: the property used to describe parent page relations, default is `parent`
- `Panel width`: default floating panel width in pixels
- `Auto-refresh interval (seconds)`: polling interval, default is `60`
- `Initial side preference`: first-open side placement preference for floating mode
- `Display mode preset`: choose `sidebar`, `floating`, or `mixed`

Notes:

- Auto-refresh is disabled by default
- When enabled, the default polling interval is `60` seconds and can be changed in settings
- When display mode is fixed to `sidebar` or `floating`, the mode-switch button is hidden

## Limitations

- Supports `DB graph` only
- Does not support `file graph`
- Root nodes come from favorite pages
- Drag sorting works only between sibling nodes
- Drag sorting is disabled while searching
- The plugin reads hierarchy relations but does not rewrite parent-child structure in Logseq

## Screenshots

![Plugin screenshot](./docs/2026-04-26.gif)

## Documentation

- [User Guide](./docs/user-guide.en.md)
- [Chinese User Guide](./docs/user-guide.md)
- [Publish Guide](./docs/publish-guide.md)
- [Feature List](./docs/feature-list.md)
- [Product Roadmap PRD](./docs/product-roadmap-prd.md)
- [Technical Design](./docs/technical-design.md)
- [Changelog](./CHANGELOG.md)
- [Release Notes Template](./docs/release-notes-template.md)
- [Marketplace Manifest Example](./docs/marketplace-manifest.example.json)
- [Marketplace PR Template](./docs/marketplace-pr-template.md)
- [Chinese README](./README.zh-CN.md)

## Marketplace Notes

- GitHub repo: `https://github.com/yanhaizhe/logseq-db-favorite-tree`
- The release page should include a custom build zip asset
- The repository should include at least one screenshot or GIF before submission
- The plugin should be submitted as `supportsDB: true` and `supportsDBOnly: true`

## Code Structure

- `src/main.ts`: startup entry and plugin bootstrapping
- `src/plugin.ts`: orchestration layer for refresh, lifecycle, display mode, and UI state
- `src/sidebar-render.ts`: native sidebar tree rendering and host-side styles
- `src/tree-service.ts`: favorite roots, property normalization, and tree/path logic
- `src/floating-layout.ts`: panel and bubble layout, dragging, resizing, and snapping
- `src/render.ts`: pure HTML rendering for the floating panel and tree nodes
- `src/settings.ts`: plugin settings and graph-scoped internal state persistence
- `src/wire-dom-events.ts`: DOM event wiring and drag-sort binding
- `src/toolbar.ts`: Logseq toolbar registration
- `src/utils.ts`, `src/theme.ts`, `src/constants.ts`, `src/types.ts`: utilities, theme, constants, and types

## Development Notes

- The current implementation targets `DB graph` and explicitly marks `file graph` as unsupported in `package.json`
- Property parsing normalizes direct values, referenced page objects, and arrays to tolerate DB response differences
- The hierarchy property supports both literal `parent` and DB-internal property key shapes
- If the favorites API response varies, the plugin attempts to normalize it into page title lists
