# User Guide

This guide explains how to install and use `Logseq DB Favorite Tree`, how to configure page hierarchy with `Page Tags`, and what features the plugin provides.

## 1. Scope

- Supports `Logseq DB graph`
- Does not support `file graph`
- Builds hierarchy from a page property, default: `Page Tags` (in Chinese UI: `🗋 页面标签`)
- Seamlessly backwards-compatible with `parent`, `tags`, and `page-tags`

## 2. Installation

### 2.1 Load locally for development

1. Install dependencies:

```bash
npm install
```

2. Build the plugin:

```bash
npm run build
```

3. Enable developer mode in Logseq
4. Choose `Load unpacked plugin`
5. Select this project directory

## 3. Core Concepts

### 3.1 Root nodes

- Favorite pages become the first-level root nodes
- Only favorited pages appear at the top level

### 3.2 Child nodes

- Child nodes come from page property relationships
- The plugin uses `Page Tags` (or `页面标签`) by default
- If a page declares another page in its `Page Tags`, it appears under that page

### 3.3 Active page tracking & auto reveal

- The plugin tracks the current active page in real time across route changes (`onRouteChanged`) and tree clicks
- When opening or switching pages in Logseq, the tree automatically highlights the active page and reveals its ancestor paths (`revealPath('merge')`)
- Clicking the `Locate` button anytime will re-center and flash highlight the current page

## 4. Configure Hierarchy (`Page Tags`) From Scratch

This section helps first-time users place one page under another page.

### 4.1 Understanding parent-child relationships in Logseq DB

- Suppose you want `Child Page A` to appear under `Parent Page B`
- In Logseq DB, simply set the property **`Page Tags`** (or `页面标签` in Chinese UI) on `Child Page A` to refer to `Parent Page B`
- The plugin renders `Child Page A` nested under `Parent Page B`

Conceptually:

```text
Child Page A
Page Tags -> Parent Page B
```

### 4.2 Method 1: Use the "Create Child Page" action (Recommended ⭐)

No manual property configuration needed — the plugin provides a 100% automated workflow:
1. In the tree, right-click any parent node (e.g. `Project Management`), or hover and click the `···` (more options) button on the right;
2. Click **"Create Child Page"**;
3. Enter the child page title and press `Enter`;
4. The plugin automatically creates the page, binds the `Page Tags` entity relationship, expands the parent branch, and highlights the newly created page. The new page remains completely clean with zero unwanted empty blocks.

### 4.3 Method 2: Manually configure page properties

If you want to attach an existing page to a parent node:
1. Open the child page (e.g. `Weekly Plan`);
2. Click **"+ Add Property"** at the top of the page;
3. Select **`Page Tags`** (or `页面标签`);
4. Choose the parent page (e.g. `Project Management`);
5. Save. The page will immediately appear nested under `Project Management`.

Example:

```text
Page: Weekly Plan
Page Tags: [[Project Management]]
```

### 4.4 Multi-parent configuration

If a page belongs under multiple parents:
1. Add multiple parent pages into `Page Tags`;
2. The page will appear simultaneously under every parent branch;
3. Using "Locate Current Page" will expand all related paths.

Example:

```text
Page: Meeting Notes
Page Tags: [[Project Management]], [[Team Collaboration]]
```

### 4.5 Property aliases and compatibility

- **Property names**: Prefers `Page Tags` and `页面标签`, with automatic fallback to `page-tags`, `parent`, and `tags`;
- **Value types**: Supports native Logseq DB entity references, reference arrays, and inline block property syntax (`tags:: [[xxx]]`, `parent:: [[xxx]]`).

### 4.6 Verification

1. Ensure the parent page is added to Logseq Favorites (to serve as a top-level root);
2. Open the favorite tree panel or sidebar;
3. Expand the parent node to view the child page;
4. Real-time sync updates the tree within 200ms without requiring manual refresh.

## 5. Everyday Usage

### 5.1 Open the plugin

- Click the toolbar icon in Logseq
- Depending on the preset, the plugin opens in sidebar, floating panel, or bubble flow

### 5.2 Display modes

- `sidebar`: renders the tree inside Logseq's native left sidebar
- `floating`: uses the floating panel and bubble flow only
- `mixed`: allows switching between native sidebar and floating panel
- Default preset is `sidebar`
- `mixed` still prefers `sidebar` when initialized

### 5.3 Browse the tree

- Click the expand control to load children
- Click a page title to open that page
- **Real-time active page highlight & path reveal**: Opening or navigating to any page (via clicks, search, or wikilinks) automatically highlights the active page and reveals its ancestor paths
- Leaf nodes do not show meaningless expand toggles

### 5.4 Search

- Type keywords in the search box
- The plugin shows matched pages and their ancestor paths
- Matching text is highlighted
- Search results can still be manually collapsed or expanded

### 5.5 Locate current page

- Click the locate action in the toolbar
- The plugin expands all matched paths to the current page and highlights it

### 5.6 Context Menu & Quick Actions

You can open the context action menu in two ways:
1. **Right-click** on any tree node;
2. Hover over a node and click the **`···`** (more options) button on the right.

The context menu **follows the exact cursor position** and incorporates viewport-boundary clamping to avoid overflowing offscreen.

Available actions (7 operations):
- **Open in Right Sidebar**: Split-screen view the page in Logseq's right secondary sidebar;
- **Create Child Page**: Inline prompt to create a new page, bind the `Page Tags` entity relationship, and reveal it immediately. Clean page with zero empty placeholder blocks;
- **Copy Page Reference**: Copies `[[Page Name]]` to your system clipboard. Employs a 5-layer resilient fallback engine (Electron native -> host async -> plugin async -> host execCommand -> plugin execCommand) to guarantee success across sandboxed iframe environments;
- **Copy Page Title**: Copies plain-text page title to the clipboard;
- **Expand All Children**: Recursively expands all descendant nodes under this branch;
- **Collapse All Children**: Recursively collapses all descendant nodes under this branch;
- **Reset Custom Sort**: Clears any drag-and-drop manual ordering for this level, restoring default title sorting.

## 6. Panel Behavior

- Drag the title bar to move the panel
- Resize from the lower-right corner
- Collapse the panel into a floating bubble
- Drag the bubble freely; it snaps to the left or right edge

## 7. Toolbar and Refresh

- **Event-Driven Real-Time Sync**: Automatically listens to database changes (`logseq.DB.onChanged`). Adding, removing, or modifying page tags or parent properties triggers an instant refresh within 200ms without manual intervention.
- **Typing & Block Creation Non-Interference**: Built-in intelligent transaction filtering ignores regular note typing, Enter/newline block splitting (`split-block`), and block indents/moves. Writing flow remains 100% uninterrupted without unnecessary tree reloading.
- **Seamless Double Buffering & Fast Indexing**: Tree indexing via Datascript completes in ~20ms. Updates are atomic with zero white-screen flickering, seamlessly preserving expanded nodes and scroll position.
- Collapse or expand the control area
- Use manual refresh when data has changed
- Auto-refresh is disabled by default
- Default polling interval is `60` seconds
- UI text follows the current Logseq language with English fallback
- Sidebar mode also includes search, locate, expand/collapse all, refresh, and settings

## 8. Sorting

- Root nodes use title sorting by default
- Child nodes use title sorting by default
- Drag sorting is supported between siblings
- Custom order is remembered per graph
- Drag sorting is disabled while searching

## 9. Settings

- `Hierarchy property`: which property defines parent page relations (default: `Page Tags`; aliases `页面标签`, `parent`, and `tags` are automatically supported)
- `Panel width`: default panel width in pixels
- `Auto-refresh interval (seconds)`: polling interval for refresh (default: `60`)
- `Initial side preference`: initial left or right placement for floating mode
- `Display mode preset`: choose `sidebar`, `floating`, or `mixed`

## 10. Graph-Scoped State

The plugin remembers these states separately for each graph:

- Panel position
- Panel size
- Bubble position
- Expanded nodes
- Collapsed control area state
- Sorting results
- Display mode and view mode

## 11. Frequently Asked Questions

### 11.1 Why does a page not show up in the tree?

- The page has not been added to Favorites (and therefore cannot serve as a top-level root);
- The page does not declare a valid `Page Tags` (or `parent`) reference to an existing tree node;
- The hierarchy property setting in plugin settings was changed to a non-matching custom key.

### 11.2 Does daily typing or pressing Enter cause tree reloads?

- **No.** The plugin features an intelligent low-level transaction filter. Typing text, pressing Enter to split blocks (`split-block`), indenting, and reordering blocks are recognized as content editing and will never trigger a tree reload.
- Only modifying page tags (`:block/tags`), the hierarchy property (`Page Tags`, `parent`), or typing explicit block property syntax (`tags:: [[xxx]]`) triggers instant real-time sync.

## 12. Recommended Workflow

- **Use the context menu "Create Child Page"**: Right-click any parent node to quickly scaffold child notes without typing manual property tags;
- **Use Favorites for top-level entry, Page Tags for structure**: Keep your major subject hubs in favorites, and categorize detailed notes using `Page Tags`;
- **Use "Open in Right Sidebar" for referencing**: Read or edit reference pages side-by-side without leaving your current workspace.
