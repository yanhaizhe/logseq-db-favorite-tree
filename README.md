# Logseq DB Favorite Tree

[中文说明](./README.zh-CN.md)

`Logseq DB Favorite Tree` is a Logseq plugin for `DB graph` that renders favorite pages as root nodes in a property-driven tree.

## Overview

- Uses favorite pages as tree roots
- Uses the page property **`Page Tags`** (in Chinese UI: `🗋 页面标签`) to build hierarchy, with automatic alias support for `parent`, `tags`, and `page-tags`
- Quick context menu on right-click or `···` hover (open in right sidebar, create child page, copy ref/title, expand/collapse, reset sort)
- Supports `sidebar`, `floating`, and `mixed` display modes
- Defaults to native sidebar mode, with optional floating panel switching
- Designed for `DB graph` only and does not support `file graph`

## Features

- Loads favorite pages as root nodes automatically
- Resolves page hierarchy and supports lazy loading aligned with Logseq DB native entity schema
- **Context Menu & Quick Actions**: Follows cursor position with viewport boundary clamping; provides 7 core operations (Open in right sidebar, Create child page, Copy page reference `[[...]]`, Copy page title, Expand all children, Collapse all children, Reset custom sort)
- **100% Automated Clean Child Page Creation**: Create child pages with bound `Page Tags` entity relationships in one step; pure new page without unwanted empty placeholder bullets (`• `)
- **5-Layer Resilient Clipboard Engine**: Electron native API -> host async clipboard -> plugin async clipboard -> host DOM execCommand -> plugin DOM execCommand, eliminating clipboard failures across sandboxed iframe and unfocused states
- **Real-Time Active Page Sync & Path Auto-Reveal**: Tracks active pages in real time across route changes (`onRouteChanged`) and tree clicks, auto-highlighting the node and expanding ancestor branches
- Ultra-fast tree indexing via Datascript (~20ms), with seamless double-buffered replacement
- Smart DB change filtering: note typing, Enter/newline block splitting, and indents never trigger refreshes; only page tag and parent property edits trigger instant real-time sync
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
5. Right-click on any tree node to "Create Child Page", or add `Page Tags` to existing pages

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

### 2. Establish page hierarchy (two methods)

**Method 1: Context Menu (Recommended ⭐)**
- Right-click on any tree node (or click `···` on hover)
- Click **"Create Child Page"**, type the title and hit Enter; the plugin creates the page and wires the hierarchy automatically.

**Method 2: Manual property assignment**
- The default hierarchy property is `Page Tags` (also matches `页面标签`, `parent`, or `tags`)
- Add `Page Tags` to a child page and reference the parent page
- The child page will immediately appear under that parent page

Example:

```text
Page: Weekly Plan
Page Tags: [[Project Management]]
```

### 3. Multiple parents

- The `Page Tags` property can contain multiple page references
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
- Right-click a node to open it in the right sidebar for split-screen reference, or copy its reference `[[...]]`
- Use search to filter the tree and keep ancestor paths visible
- Use `Locate current page` to reveal the current page in all matching paths
- Drag sibling nodes to save a custom order when not searching

## Settings

- `Hierarchy property`: the property used to describe parent page relations, default is `Page Tags` (aliases `页面标签`, `parent`, `tags` supported)
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
- [UI/UX Optimization Plan](./docs/ux-optimization-plan.md)
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
- `src/db-change.ts`: DB transaction filter and change detector, shielding normal typing noise and accurately recognizing tag/property updates
- `src/sidebar-render.ts`: native sidebar tree rendering and host-side styles
- `src/tree-service.ts`: favorite roots, fast Datascript tree indexing, property normalization, and tree/path logic
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
