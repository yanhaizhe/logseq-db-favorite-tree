# Changelog

All notable changes to this project are recorded in this file.

The format follows a simple Keep a Changelog style and focuses on user-visible behavior.

## [Unreleased]

### Added

- Intelligent DB event filtering (`src/db-change.ts`): shields normal note typing, Enter/newline block creation (`split-block`), and block indents/moves from triggering tree reloads, ensuring zero disruption while writing
- Event-driven real-time sync: instant tree updates triggered exclusively when adding, modifying, or removing page tags (`tags`, `page tags`, `:block/tags`) or hierarchy property values (`parent`), including inline text property syntax (`tags:: [[xxx]]`, `parent:: [[xxx]]`)
- Ultra-fast Datascript bulk indexing: single Datomic query pulling all pages and tags in ~20ms (reduced from 10–30s of sequential RPCs, 500+ times speedup) with concurrent chunked fallback
- Double buffering & queue compensation: in-memory atomic index replacement without white-screen flickering, plus pending event queue to guarantee consistency under concurrent edits
- Automated test suite: 16 unit tests for DB transaction filtering, text property syntax detection, and entity modification rules
- Sort mode toggle: switch between default and custom order per level without losing saved custom order
- Clear custom sort per level with confirmation dialog
- Visual indicator for levels with active or saved custom sort orders
- Focus current path action: keep only the current page path expanded
- Collapse other branches action: collapse all branches outside the current page path
- Search match navigation: previous/next match cycling with position display (N/M)
- Create child page: inline input under any node with auto parent-property wiring
- Duplicate page name prevention on child page creation
- Automatic rollback of created page when parent-property write fails
- Open page in right sidebar from tree nodes
- All new actions available in both sidebar and floating panel modes

### Changed

- Updated technical design (`technical-design.md`), feature list (`feature-list.md`), product roadmap PRD (`product-roadmap-prd.md`), and user guides (`user-guide.md`, `user-guide.en.md`) to reflect event filtering architecture, Datascript bulk querying, and performance benchmarks
- Expand/collapse all in search mode now operates on visible matched branches only
- Added UI/UX optimization plan document with phased improvement roadmap

## [1.1.1] - 2026-04-27

### Added

- Native sidebar tree mode integrated into Logseq's left sidebar
- Search, locate-current-page, expand/collapse all, refresh, and settings actions in sidebar mode
- Display mode preset setting with `sidebar`, `floating`, and `mixed`
- Search keyword highlighting in both floating panel and native sidebar
- Graph-scoped persistence for display mode, controls state, sorting, expanded nodes, and layout
- Resizable floating panel with drag handle and default-size restore
- Refreshed icons and tooltip hints for action buttons

### Changed

- Default display preset is now `sidebar`
- `mixed` mode now initializes with sidebar shown first
- Leaf nodes no longer show misleading expand/collapse toggles
- Sidebar and floating UIs are now mutually exclusive instead of rendering together
- Sidebar mode now aligns more closely with native Logseq visual patterns

### Fixed

- Sidebar node expand/collapse actions not responding
- Sidebar page opening actions not responding
- Sidebar search input not taking effect
- Sidebar search losing focus after every keystroke
- Search-result trees not respecting manual collapse/expand in either mode
- Floating-only preset leaving sidebar UI behind
- Tooltip layering issues where action hints could be covered by later content

## [1.0.0] - 2026-04-27

### Added

- Initial public release of `Logseq DB Favorite Tree`
- Property-driven hierarchy tree built from favorite pages
- Floating panel, floating bubble, search, locate-current-page, sorting, and refresh controls
- DB graph support with file graph explicitly unsupported
