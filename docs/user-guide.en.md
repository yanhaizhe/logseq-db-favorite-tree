# User Guide

This guide explains how to install and use `Logseq DB Favorite Tree`, how to configure the `parent` property, and what the plugin supports.

## 1. Scope

- Supports `Logseq DB graph`
- Does not support `file graph`
- Builds hierarchy from a page property, default: `parent`

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

- Child nodes come from page property relations
- The plugin reads the `parent` property by default
- If a page declares another page as its parent, it appears under that page

### 3.3 Locate current page

- If the current page exists in the tree, the plugin can expand all matching paths to it
- If the same page appears in multiple paths, all related paths are expanded

## 4. Configure the `parent` Property From Scratch

This section helps first-time users place one page under another page.

### 4.1 Target relationship

If you want `Child Page A` to appear under `Parent Page B`:

- Add a property named `parent` to `Child Page A`
- Set its value to `Parent Page B`
- The plugin will render `Child Page A` under `Parent Page B`

### 4.2 Prepare the parent page

1. Create or open the page you want to use as a parent, for example `Project Management`
2. Add that page to Logseq favorites
3. It will then appear as a root node in the tree

Note:

- A page can still be a parent even if it is not favorited
- But it will not appear as a first-level root unless it is in favorites

### 4.3 Add the property on the child page

1. Open the child page, for example `Weekly Plan`
2. Add a page property
3. Use the property name `parent`
4. Save the property

Requirement:

- The default property name must be `parent`
- If you changed the hierarchy property in plugin settings, use that exact same name

### 4.4 Choose the property type

Recommended:

- Prefer a page reference or `Node` type when available
- This is the most stable way to reference parent pages

Compatibility:

- The plugin prefers `Node`-style values
- It also supports page reference objects, arrays, and `[[Page Name]]` text references

### 4.5 Set a single parent

If a page has only one parent:

```text
Page: Weekly Plan
Property: parent
Value: [[Project Management]]
```

### 4.6 Set multiple parents

If a page should appear under multiple parents:

- Make the `parent` property multi-value
- Add multiple referenced pages to the same property

Example:

```text
Page: Meeting Notes
Property: parent
Value 1: [[Project Management]]
Value 2: [[Team Collaboration]]
```

Result:

- The page appears under all configured parent paths
- `Locate current page` will expand all related paths

## 5. Everyday Usage

### 5.1 Open the plugin

- Click the toolbar icon in Logseq
- The plugin opens as a floating panel

### 5.2 Browse the tree

- Click the expand control to load children
- Click a page title to open that page
- The current page is highlighted in the tree

### 5.3 Search

- Type keywords in the search box
- The plugin shows matched pages and their ancestor paths

### 5.4 Locate current page

- Click the locate action in the toolbar
- The plugin expands all matched paths to the current page

## 6. Panel Behavior

- Drag the title bar to move the panel
- Resize from the lower-right corner
- Collapse the panel into a floating bubble
- Drag the bubble freely; it snaps to the left or right edge

## 7. Toolbar and Refresh

- Collapse or expand the control area
- Use manual refresh when data has changed
- Auto-refresh is disabled by default
- Default polling interval is `60` seconds
- UI text follows the current Logseq language with English fallback

## 8. Sorting

- Root nodes use title sorting by default
- Child nodes use title sorting by default
- Drag sorting is supported between siblings
- Custom order is remembered per graph
- Drag sorting is disabled while searching

## 9. Settings

- `Hierarchy property`: which property defines parent page relations
- `Panel width`: default panel width
- `Auto-refresh interval (seconds)`: polling interval for refresh
- `Initial side preference`: initial left or right placement

## 10. Graph-Scoped State

The plugin remembers these states separately for each graph:

- Panel position
- Panel size
- Bubble position
- Expanded nodes
- Collapsed control area state
- Sorting results
- View mode
