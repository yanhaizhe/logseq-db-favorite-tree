import type { FavoriteTreeI18n } from './i18n'
import { renderIcon, renderTooltip } from './render'
import type { ContextMenuState, TreeStateSnapshot } from './types'
import { escapeHtml, normalizeTitle, sanitizeDomId } from './utils'

type SidebarTreeRenderAccessors = {
  getChildrenFor: (title: string) => string[]
}

type SidebarStatusTone = 'info' | 'warning' | 'error'

type SidebarStatusAction = {
  action: string
  label: string
}

type SidebarCreateChildComposerState = {
  parentTitle: string
  draftTitle: string
}

function renderSidebarCreateChildComposer(state: SidebarCreateChildComposerState, i18n: FavoriteTreeI18n): string {
  return `
    <div class="favorite-sidebar-tree__create-child-composer">
      <div class="favorite-sidebar-tree__create-child-copy">
        <span class="favorite-sidebar-tree__create-child-title">${escapeHtml(i18n.t('createChildPageForParent', { title: state.parentTitle }))}</span>
        <span class="favorite-sidebar-tree__create-child-hint">${escapeHtml(
          i18n.t('createChildInputHint', { parent: state.parentTitle }),
        )}</span>
      </div>
      <div class="favorite-sidebar-tree__create-child-controls">
        <input
          class="favorite-sidebar-tree__create-child-input"
          data-role="create-child-input"
          data-on-change="sidebarTreeCreateChildInput"
          type="text"
          value="${escapeHtml(state.draftTitle)}"
          placeholder="${escapeHtml(i18n.t('createChildInputPlaceholder'))}"
          spellcheck="false"
        />
        <button class="favorite-sidebar-tree__text-btn" data-on-click="sidebarTreeSubmitCreateChild">${escapeHtml(i18n.t('createChildSubmit'))}</button>
        <button class="favorite-sidebar-tree__text-btn" data-on-click="sidebarTreeCancelCreateChild">${escapeHtml(i18n.t('createChildCancel'))}</button>
      </div>
    </div>
  `
}

export function renderSidebarTree(
  state: TreeStateSnapshot,
  accessors: SidebarTreeRenderAccessors,
  i18n: FavoriteTreeI18n,
): string {
  const hasExpandedNodes = state.expandedKeys.size > 0
  const expandActionLabel = hasExpandedNodes ? i18n.t('collapseLabel') : i18n.t('expandLabel')
  const expandActionTitle = hasExpandedNodes ? i18n.t('collapseAllTitle') : i18n.t('expandAllTitle')
  const expandActionIcon = hasExpandedNodes
    ? renderIcon('collapse-tree', 'favorite-sidebar-tree__button-icon')
    : renderIcon('expand-tree', 'favorite-sidebar-tree__button-icon')
  const controlsToggleTitle = state.controlsCollapsed ? i18n.t('expandControlsTitle') : i18n.t('collapseControlsTitle')
  const controlsToggleLabel = state.controlsCollapsed
    ? renderIcon('panel-controls-open', 'favorite-sidebar-tree__icon')
    : renderIcon('panel-controls-close', 'favorite-sidebar-tree__icon')
  const normalizedQuery = normalizeTitle(state.searchQuery)
  const isSearching = normalizedQuery.length > 0
  const visibleRoots = isSearching
    ? state.rootFavorites.filter((title) => isSidebarNodeVisible(title, normalizedQuery, accessors, []))
    : state.rootFavorites
  const noticeMarkup = renderSidebarNotice(state, i18n)
  const content = state.searching && isSearching
    ? renderSidebarStatusCard({ title: i18n.t('searchIndexing') })
    : state.searchError && isSearching
    ? renderSidebarStatusCard({
        tone: 'error',
        title: i18n.t('searchFailedTitle'),
        description: i18n.t('searchFailedBody', { message: state.searchError }),
        hint: i18n.t('searchFailedHint'),
        actions: [
          { action: 'sidebarTreeRefresh', label: i18n.t('manualRefresh') },
          { action: 'sidebarTreeOpenSettings', label: i18n.t('openSettings') },
        ],
      })
    : isSearching && !visibleRoots.length
    ? renderSidebarStatusCard({
        title: i18n.t('noMatchesTitle'),
        description: i18n.t('noMatches'),
        hint: i18n.t('noMatchesHint'),
      })
    : state.rootFavorites.length > 0
    ? `${noticeMarkup}${visibleRoots
        .map((title, index) => renderSidebarNode(title, 0, [], index === visibleRoots.length - 1, state, accessors, i18n, normalizedQuery))
        .join('')}`
    : state.refreshing
    ? renderSidebarStatusCard({ title: i18n.t('loadingFavorites') })
    : state.lastRefreshError
    ? renderSidebarStatusCard({
        tone: 'error',
        title: i18n.t('refreshFailedTitle'),
        description: i18n.t('refreshFailed', { message: state.lastRefreshError }),
        hint: i18n.t('refreshFailedHint'),
        actions: [
          { action: 'sidebarTreeRefresh', label: i18n.t('manualRefresh') },
          { action: 'sidebarTreeOpenSettings', label: i18n.t('openSettings') },
        ],
      })
    : renderSidebarStatusCard({
        tone: 'warning',
        title: i18n.t('noFavoritesTitle'),
        description: i18n.t('noFavorites'),
        hint: i18n.t('noFavoritesHint'),
        actions: [{ action: 'sidebarTreeRefresh', label: i18n.t('manualRefresh') }],
      })
  const controlsMarkup = state.controlsCollapsed
    ? ''
    : `
      <div class="favorite-sidebar-tree__controls">
        <div class="favorite-sidebar-tree__searchbar">
          <div class="favorite-sidebar-tree__search-shell">
            <span class="favorite-sidebar-tree__search-icon">${renderIcon('search', 'favorite-sidebar-tree__icon')}</span>
            <input
              class="favorite-sidebar-tree__search-input"
              data-role="sidebar-search-input"
              data-on-change="sidebarTreeSearchInput"
              type="search"
              value="${escapeHtml(state.searchQuery)}"
              placeholder="${escapeHtml(i18n.t('searchPlaceholder'))}"
              spellcheck="false"
            />
          </div>
          ${isSearching && state.searchMatchCount > 0
            ? `
              <div class="favorite-sidebar-tree__search-nav">
                <button
                  class="favorite-sidebar-tree__text-btn has-tooltip"
                  data-on-click="sidebarTreeFocusPreviousSearchMatch"
                  aria-label="${escapeHtml(i18n.t('searchPrevMatch'))}"
                >${escapeHtml(i18n.t('searchPrevMatch'))}${renderTooltip(i18n.t('searchPrevMatch'), 'favorite-sidebar-tree__tooltip')}</button>
                <span class="favorite-sidebar-tree__search-nav-count">${escapeHtml(
                  i18n.t('searchMatchPosition', {
                    current: state.currentSearchMatchNumber,
                    total: state.searchMatchCount,
                  }),
                )}</span>
                <button
                  class="favorite-sidebar-tree__text-btn has-tooltip"
                  data-on-click="sidebarTreeFocusNextSearchMatch"
                  aria-label="${escapeHtml(i18n.t('searchNextMatch'))}"
                >${escapeHtml(i18n.t('searchNextMatch'))}${renderTooltip(i18n.t('searchNextMatch'), 'favorite-sidebar-tree__tooltip')}</button>
              </div>
            `
            : ''}
        </div>
        ${state.createChildDraftParent
          ? renderSidebarCreateChildComposer(
              {
                parentTitle: state.createChildDraftParent,
                draftTitle: state.createChildDraftTitle,
              },
              i18n,
            )
          : ''}
        <div class="favorite-sidebar-tree__toolbar">
          <button
            class="favorite-sidebar-tree__text-btn has-tooltip"
            data-on-click="sidebarTreeLocateCurrent"
            aria-label="${escapeHtml(i18n.t('locateTitle'))}"
          >${renderIcon('locate', 'favorite-sidebar-tree__button-icon')}${escapeHtml(i18n.t('locateLabel'))}${renderTooltip(i18n.t('locateTitle'), 'favorite-sidebar-tree__tooltip')}</button>
          <button
            class="favorite-sidebar-tree__text-btn has-tooltip"
            data-on-click="sidebarTreeFocusCurrentPath"
            aria-label="${escapeHtml(i18n.t('focusCurrentPathTitle'))}"
          >${escapeHtml(i18n.t('focusCurrentPathLabel'))}${renderTooltip(i18n.t('focusCurrentPathTitle'), 'favorite-sidebar-tree__tooltip')}</button>
          <button
            class="favorite-sidebar-tree__text-btn has-tooltip"
            data-on-click="sidebarTreeCollapseOtherBranches"
            aria-label="${escapeHtml(i18n.t('collapseOtherBranchesTitle'))}"
          >${escapeHtml(i18n.t('collapseOtherBranchesLabel'))}${renderTooltip(i18n.t('collapseOtherBranchesTitle'), 'favorite-sidebar-tree__tooltip')}</button>
          ${state.rootSortHasCustomOrder
            ? `
              <button
                class="favorite-sidebar-tree__text-btn has-tooltip ${state.rootSortMode === 'custom' ? 'is-active' : ''}"
                data-on-click="sidebarTreeToggleSortMode"
                data-parent-key="__root__"
                aria-label="${escapeHtml(state.rootSortMode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom'))}"
              >${escapeHtml(state.rootSortMode === 'custom' ? i18n.t('sortModeCustomLabel') : i18n.t('sortModeDefaultLabel'))}${renderTooltip(state.rootSortMode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom'), 'favorite-sidebar-tree__tooltip')}</button>
              <button
                class="favorite-sidebar-tree__text-btn has-tooltip"
                data-on-click="sidebarTreeClearCustomSort"
                data-parent-key="__root__"
                aria-label="${escapeHtml(i18n.t('clearCustomSort'))}"
              >${escapeHtml(i18n.t('clearCustomSort'))}${renderTooltip(i18n.t('clearCustomSort'), 'favorite-sidebar-tree__tooltip')}</button>
            `
            : ''}
          <button
            class="favorite-sidebar-tree__text-btn has-tooltip ${hasExpandedNodes ? 'is-active' : ''}"
            data-on-click="sidebarTreeToggleExpandAll"
            aria-label="${escapeHtml(expandActionTitle)}"
          >${expandActionIcon}${escapeHtml(expandActionLabel)}${renderTooltip(expandActionTitle, 'favorite-sidebar-tree__tooltip')}</button>
        </div>
      </div>
    `

  return `
    <section class="favorite-sidebar-tree ${state.refreshing ? 'is-refreshing' : ''}" data-favorite-sidebar-tree="true">
      <div class="favorite-sidebar-tree__header">
        <div class="favorite-sidebar-tree__header-main">
          <span class="favorite-sidebar-tree__heading-wrap">
            <span class="favorite-sidebar-tree__heading-icon">${renderIcon('sidebar', 'favorite-sidebar-tree__icon')}</span>
            <span class="favorite-sidebar-tree__heading">${escapeHtml(i18n.t('panelTitle'))}</span>
          </span>
          <span class="favorite-sidebar-tree__count">${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}</span>
        </div>
        <div class="favorite-sidebar-tree__actions">
          <button
            class="favorite-sidebar-tree__icon-btn has-tooltip ${state.controlsCollapsed ? 'is-active' : ''}"
            data-on-click="sidebarTreeToggleControls"
            aria-label="${escapeHtml(controlsToggleTitle)}"
            aria-expanded="${state.controlsCollapsed ? 'false' : 'true'}"
          >${controlsToggleLabel}${renderTooltip(controlsToggleTitle, 'favorite-sidebar-tree__tooltip')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn has-tooltip"
            data-on-click="sidebarTreeRefresh"
            aria-label="${escapeHtml(i18n.t('manualRefresh'))}"
          >${renderIcon('refresh', 'favorite-sidebar-tree__icon')}${renderTooltip(i18n.t('manualRefresh'), 'favorite-sidebar-tree__tooltip')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn has-tooltip"
            data-on-click="sidebarTreeOpenSettings"
            aria-label="${escapeHtml(i18n.t('openSettings'))}"
          >${renderIcon('sliders', 'favorite-sidebar-tree__icon')}${renderTooltip(i18n.t('openSettings'), 'favorite-sidebar-tree__tooltip')}</button>
          ${state.canSwitchDisplayMode
            ? `
              <button
                class="favorite-sidebar-tree__icon-btn has-tooltip"
                data-on-click="sidebarTreeShowFloating"
                aria-label="${escapeHtml(i18n.t('switchToFloating'))}"
              >${renderIcon('floating', 'favorite-sidebar-tree__icon')}${renderTooltip(i18n.t('switchToFloating'), 'favorite-sidebar-tree__tooltip')}</button>
            `
            : ''}
        </div>
      </div>
      ${controlsMarkup}
      <div class="favorite-sidebar-tree__body">
        ${content}
      </div>
      ${state.contextMenu ? `
        <div class="favorite-sidebar-tree__context-backdrop" data-on-click="sidebarTreeCloseContextMenu"></div>
        ${renderSidebarContextMenu(state.contextMenu, i18n)}
      ` : ''}
    </section>
  `
}

function renderSidebarContextMenu(menu: ContextMenuState, i18n: FavoriteTreeI18n): string {
  const { page, parentKey, x, y, hasChildren, hasCustomSort, isExpanded } = menu
  const expandCollapseAction = isExpanded ? 'collapse-subtree' : 'expand-subtree'
  const expandCollapseLabel = isExpanded ? i18n.t('contextMenuCollapseSubtree') : i18n.t('contextMenuExpandSubtree')
  const expandCollapseIcon = isExpanded ? 'collapse-tree' : 'expand-tree'

  return `
    <div
      class="favorite-sidebar-tree__context-menu"
      style="left: ${x}px; top: ${y}px;"
    >
      <div class="favorite-sidebar-tree__context-header">${escapeHtml(page)}</div>
      <div class="favorite-sidebar-tree__context-divider"></div>
      <button class="favorite-sidebar-tree__context-item" data-context-action="open-in-right-sidebar" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
        <span class="favorite-sidebar-tree__context-icon">${renderIcon('right-sidebar', 'favorite-sidebar-tree__icon')}</span>
        <span class="favorite-sidebar-tree__context-label">${escapeHtml(i18n.t('contextMenuOpenInRightSidebar'))}</span>
        <span class="favorite-sidebar-tree__context-shortcut">Shift+Click</span>
      </button>
      <button class="favorite-sidebar-tree__context-item" data-context-action="create-child-page" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
        <span class="favorite-sidebar-tree__context-icon">${renderIcon('child-plus', 'favorite-sidebar-tree__icon')}</span>
        <span class="favorite-sidebar-tree__context-label">${escapeHtml(i18n.t('contextMenuCreateChildPage'))}</span>
      </button>
      <div class="favorite-sidebar-tree__context-divider"></div>
      <button class="favorite-sidebar-tree__context-item" data-context-action="copy-page-ref" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
        <span class="favorite-sidebar-tree__context-icon">${renderIcon('copy', 'favorite-sidebar-tree__icon')}</span>
        <span class="favorite-sidebar-tree__context-label">${escapeHtml(i18n.t('contextMenuCopyPageRef'))}</span>
      </button>
      <button class="favorite-sidebar-tree__context-item" data-context-action="copy-page-title" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
        <span class="favorite-sidebar-tree__context-icon">${renderIcon('copy', 'favorite-sidebar-tree__icon')}</span>
        <span class="favorite-sidebar-tree__context-label">${escapeHtml(i18n.t('contextMenuCopyPageTitle'))}</span>
      </button>
      ${hasChildren ? `
        <div class="favorite-sidebar-tree__context-divider"></div>
        <button class="favorite-sidebar-tree__context-item" data-context-action="${expandCollapseAction}" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
          <span class="favorite-sidebar-tree__context-icon">${renderIcon(expandCollapseIcon as any, 'favorite-sidebar-tree__icon')}</span>
          <span class="favorite-sidebar-tree__context-label">${escapeHtml(expandCollapseLabel)}</span>
        </button>
      ` : ''}
      ${hasCustomSort ? `
        <div class="favorite-sidebar-tree__context-divider"></div>
        <button class="favorite-sidebar-tree__context-item favorite-sidebar-tree__context-item--danger" data-context-action="clear-custom-sort" data-on-click="sidebarTreeContextAction" data-page="${escapeHtml(page)}" data-parent-key="${escapeHtml(parentKey)}">
          <span class="favorite-sidebar-tree__context-icon">${renderIcon('close', 'favorite-sidebar-tree__icon')}</span>
          <span class="favorite-sidebar-tree__context-label">${escapeHtml(i18n.t('contextMenuClearCustomSort'))}</span>
        </button>
      ` : ''}
    </div>
  `
}

export const SIDEBAR_TREE_HOST_STYLE = `
.favorite-sidebar-tree {
  margin: 8px 0 12px;
  padding: 0 0 4px;
  position: relative;
  isolation: isolate;
  color: var(--ls-primary-text-color, #1f2937);
}

.favorite-sidebar-tree.is-refreshing::before {
  content: "";
  position: absolute;
  left: -30%;
  top: 0;
  width: 60%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--ls-link-text-color, #2563eb) 58%, transparent 42%) 30%,
    color-mix(in srgb, var(--ls-link-text-color, #2563eb) 88%, transparent 12%) 50%,
    color-mix(in srgb, var(--ls-link-text-color, #2563eb) 58%, transparent 42%) 70%,
    transparent 100%
  );
  opacity: 0.95;
  z-index: 70;
  animation: ft-sidebar-refresh-bar 1.05s ease-in-out infinite;
}

.favorite-sidebar-tree.is-refreshing .favorite-sidebar-tree__icon-btn[data-on-click="sidebarTreeRefresh"] svg {
  animation: ft-sidebar-spin 0.9s linear infinite;
}

.favorite-sidebar-tree__header {
  position: relative;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px 8px;
  font-size: 12px;
  line-height: 1.35;
}

.favorite-sidebar-tree__header-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.favorite-sidebar-tree__heading-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.favorite-sidebar-tree__heading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 10%, transparent 90%);
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__heading {
  font-weight: 700;
}

.favorite-sidebar-tree__count {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--ls-tertiary-background-color, #f5f7fb);
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 11px;
  white-space: nowrap;
}

.favorite-sidebar-tree__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  overflow: visible;
}

.favorite-sidebar-tree__icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ls-secondary-text-color, #6b7280);
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.favorite-sidebar-tree__icon-btn.has-tooltip:hover,
.favorite-sidebar-tree__icon-btn.has-tooltip:focus-visible,
.favorite-sidebar-tree__text-btn.has-tooltip:hover,
.favorite-sidebar-tree__text-btn.has-tooltip:focus-visible {
  z-index: 60;
}

.favorite-sidebar-tree__icon-btn:hover {
  background: var(--ls-tertiary-background-color, #f5f7fb);
  color: var(--ls-primary-text-color, #1f2937);
  transform: translateY(-1px);
}

.favorite-sidebar-tree__icon-btn.is-active {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 10%, transparent 90%);
  color: var(--ls-link-text-color, #2563eb);
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 24%, transparent 76%);
}

.favorite-sidebar-tree__controls {
  position: relative;
  z-index: 30;
  padding: 0 12px 8px;
}

.favorite-sidebar-tree__searchbar {
  position: relative;
  z-index: 33;
  margin-bottom: 8px;
}

.favorite-sidebar-tree__search-shell {
  position: relative;
}

.favorite-sidebar-tree__search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--ls-secondary-text-color, #6b7280);
  transform: translateY(-50%);
  pointer-events: none;
}

.favorite-sidebar-tree__search-input {
  width: 100%;
  min-height: 28px;
  padding: 0 10px 0 31px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 72%, transparent 28%);
  border-radius: 8px;
  background: var(--ls-primary-background-color, #ffffff);
  color: var(--ls-primary-text-color, #1f2937);
  font-size: 12px;
  line-height: 1.4;
  transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
}

.favorite-sidebar-tree__search-input::placeholder {
  color: var(--ls-secondary-text-color, #6b7280);
}

.favorite-sidebar-tree__search-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 58%, transparent 42%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ls-link-text-color, #2563eb) 12%, transparent 88%);
}

.favorite-sidebar-tree__search-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.favorite-sidebar-tree__search-nav-count {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--ls-tertiary-background-color, #f5f7fb);
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.favorite-sidebar-tree__create-child-composer {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--ls-link-text-color, #2563eb) 18%, transparent 82%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 6%, transparent 94%);
}

.favorite-sidebar-tree__create-child-copy {
  display: grid;
  gap: 4px;
}

.favorite-sidebar-tree__create-child-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ls-primary-text-color, #1f2937);
}

.favorite-sidebar-tree__create-child-hint {
  font-size: 11px;
  line-height: 1.45;
  color: var(--ls-secondary-text-color, #6b7280);
}

.favorite-sidebar-tree__create-child-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.favorite-sidebar-tree__create-child-input {
  flex: 1 1 180px;
  min-width: 0;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 72%, transparent 28%);
  border-radius: 8px;
  background: var(--ls-primary-background-color, #ffffff);
  color: var(--ls-primary-text-color, #1f2937);
  font-size: 12px;
  line-height: 1.4;
}

.favorite-sidebar-tree__create-child-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 58%, transparent 42%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ls-link-text-color, #2563eb) 12%, transparent 88%);
}

.favorite-sidebar-tree__toolbar {
  position: relative;
  z-index: 32;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.favorite-sidebar-tree__text-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: var(--ls-tertiary-background-color, #f5f7fb);
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, color 120ms ease;
}

.favorite-sidebar-tree__text-btn:hover {
  color: var(--ls-primary-text-color, #1f2937);
  transform: translateY(-1px);
}

.favorite-sidebar-tree__text-btn.is-active {
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__icon {
  width: 14px;
  height: 14px;
}

.favorite-sidebar-tree__button-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.favorite-sidebar-tree__tooltip {
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  z-index: 12;
  width: max-content;
  max-width: 220px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 80%, transparent 20%);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ls-primary-background-color, #ffffff) 96%, var(--ls-tertiary-background-color, #f5f7fb) 4%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
  color: var(--ls-primary-text-color, #1f2937);
  font-size: 11px;
  line-height: 1.4;
  white-space: normal;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -4px);
  transition: opacity 140ms ease, transform 140ms ease;
}

.favorite-sidebar-tree__icon-btn.has-tooltip:hover .favorite-sidebar-tree__tooltip,
.favorite-sidebar-tree__icon-btn.has-tooltip:focus-visible .favorite-sidebar-tree__tooltip,
.favorite-sidebar-tree__text-btn.has-tooltip:hover .favorite-sidebar-tree__tooltip,
.favorite-sidebar-tree__text-btn.has-tooltip:focus-visible .favorite-sidebar-tree__tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.favorite-sidebar-tree__actions .favorite-sidebar-tree__icon-btn .favorite-sidebar-tree__tooltip {
  left: auto;
  right: 0;
  transform: translateY(-4px);
}

.favorite-sidebar-tree__actions .favorite-sidebar-tree__icon-btn.has-tooltip:hover .favorite-sidebar-tree__tooltip,
.favorite-sidebar-tree__actions .favorite-sidebar-tree__icon-btn.has-tooltip:focus-visible .favorite-sidebar-tree__tooltip {
  transform: translateY(0);
}

.favorite-sidebar-tree__body {
  position: relative;
  z-index: 1;
  font-size: 13px;
}

.favorite-sidebar-tree__node {
  position: relative;
}

.favorite-sidebar-tree__node--child {
  position: relative;
}

.favorite-sidebar-tree__node--child::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, var(--ls-border-color, #d7dce5) 55%, transparent 45%);
  transition: background-color 140ms ease;
  pointer-events: none;
}

.favorite-sidebar-tree__node--child:last-child::before,
.favorite-sidebar-tree__node--child[data-is-last="true"]::before {
  bottom: auto;
  height: 14px;
}

.favorite-sidebar-tree__node--child > .favorite-sidebar-tree__row::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 0;
  width: 7px;
  height: 14px;
  border-left: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 55%, transparent 45%);
  border-bottom: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 55%, transparent 45%);
  border-bottom-left-radius: 4px;
  pointer-events: none;
  transition: border-color 140ms ease;
}

.favorite-sidebar-tree__node--child:hover::before,
.favorite-sidebar-tree__node--child:hover > .favorite-sidebar-tree__row::before,
.favorite-sidebar-tree__node:hover > .favorite-sidebar-tree__children > .favorite-sidebar-tree__node--child::before {
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 45%, var(--ls-border-color, #d7dce5) 55%);
  background-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 45%, var(--ls-border-color, #d7dce5) 55%);
}

.favorite-sidebar-tree__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 2px 12px 2px 4px;
  border-radius: 6px;
  transition: background-color 120ms ease;
}

.favorite-sidebar-tree__row:hover {
  background: var(--ls-tertiary-background-color, #f5f7fb);
}

.favorite-sidebar-tree__row.is-current {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 9%, transparent 91%);
}

.favorite-sidebar-tree__row.is-search-match-current {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 14%, transparent 86%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ls-link-text-color, #2563eb) 34%, transparent 66%);
}

.favorite-sidebar-tree__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ls-secondary-text-color, #6b7280);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.favorite-sidebar-tree__toggle:hover {
  background: color-mix(in srgb, var(--ls-border-color, #d7dce5) 32%, transparent 68%);
}

.favorite-sidebar-tree__toggle.is-placeholder {
  cursor: default;
}

.favorite-sidebar-tree__caret {
  width: 7px;
  height: 7px;
  border-right: 1.6px solid currentColor;
  border-bottom: 1.6px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 120ms ease;
}

.favorite-sidebar-tree__toggle.is-expanded .favorite-sidebar-tree__caret {
  transform: rotate(45deg) translate(-1px, -1px);
}

.favorite-sidebar-tree__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: color 120ms ease;
}

.favorite-sidebar-tree__title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-sidebar-tree__title:hover .favorite-sidebar-tree__title-text {
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__inline-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ls-secondary-text-color, #6b7280);
  cursor: pointer;
  flex: 0 0 22px;
  opacity: 0;
  transition: opacity 120ms ease, background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.favorite-sidebar-tree__row:hover .favorite-sidebar-tree__inline-action,
.favorite-sidebar-tree__inline-action:focus-visible,
.favorite-sidebar-tree__inline-action.is-active {
  opacity: 1;
}

.favorite-sidebar-tree__inline-action:hover,
.favorite-sidebar-tree__inline-action:focus-visible {
  color: var(--ls-link-text-color, #2563eb);
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 24%, transparent 76%);
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 8%, transparent 92%);
}

.favorite-sidebar-tree__highlight {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 16%, transparent 84%);
  color: inherit;
}

.favorite-sidebar-tree__badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 12%, transparent 88%);
  color: var(--ls-link-text-color, #2563eb);
  font-size: 10px;
  line-height: 1.5;
  font-weight: 600;
}

.favorite-sidebar-tree__sort-mode {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.favorite-sidebar-tree__sort-action {
  padding: 0 6px;
  min-height: 20px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 72%, transparent 28%);
  border-radius: 999px;
  background: transparent;
  color: var(--ls-secondary-text-color, #6b7280);
  cursor: pointer;
  font-size: 10px;
  line-height: 1.4;
}

.favorite-sidebar-tree__sort-action.is-active {
  color: var(--ls-link-text-color, #2563eb);
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 30%, transparent 70%);
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 10%, transparent 90%);
}

.favorite-sidebar-tree__children {
  margin-left: 16px;
  padding-left: 0;
  position: relative;
}

.favorite-sidebar-tree__empty {
  margin: 4px 12px 8px;
  padding: 10px 12px;
  border: 1px dashed color-mix(in srgb, var(--ls-border-color, #d7dce5) 78%, transparent 22%);
  border-radius: 10px;
  color: var(--ls-secondary-text-color, #6b7280);
  background: var(--ls-tertiary-background-color, #f5f7fb);
  font-size: 12px;
  line-height: 1.5;
}

.favorite-sidebar-tree__empty--warning {
  border-color: color-mix(in srgb, #d97706 28%, var(--ls-border-color, #d7dce5) 72%);
}

.favorite-sidebar-tree__empty--error {
  border-color: color-mix(in srgb, #dc2626 28%, var(--ls-border-color, #d7dce5) 72%);
  color: #b91c1c;
}

.favorite-sidebar-tree__empty-title {
  color: var(--ls-primary-text-color, #1f2937);
  font-weight: 600;
}

.favorite-sidebar-tree__empty-body,
.favorite-sidebar-tree__empty-hint {
  margin-top: 4px;
}

@keyframes ft-sidebar-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes ft-sidebar-refresh-bar {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(260%);
  }
}

.favorite-sidebar-tree__empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

/* Sidebar Context Menu */
.favorite-sidebar-tree__context-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99998;
  background: transparent;
  cursor: default;
}

.favorite-sidebar-tree__context-menu {
  position: fixed;
  z-index: 99999;
  min-width: 190px;
  padding: 5px;
  background: var(--ls-secondary-background-color, var(--ls-primary-background-color, #ffffff));
  border: 1px solid var(--ls-border-color, rgba(148, 163, 184, 0.28));
  border-radius: 9px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.08);
  animation: ft-sidebar-menu-appear 120ms cubic-bezier(0.16, 1, 0.3, 1);
  color: var(--ls-primary-text-color, #1f2937);
}

html[data-theme="dark"] .favorite-sidebar-tree__context-menu,
.dark .favorite-sidebar-tree__context-menu {
  background: var(--ls-secondary-background-color, #1e222d);
  border-color: var(--ls-border-color, rgba(255, 255, 255, 0.12));
  color: var(--ls-primary-text-color, #e5e7eb);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.25);
}

html[data-theme="dark"] .favorite-sidebar-tree__context-divider,
.dark .favorite-sidebar-tree__context-divider {
  background: rgba(255, 255, 255, 0.12);
}

html[data-theme="dark"] .favorite-sidebar-tree__context-shortcut,
.dark .favorite-sidebar-tree__context-shortcut {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--ls-secondary-text-color, #9ca3af);
}

@keyframes ft-sidebar-menu-appear {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.favorite-sidebar-tree__context-header {
  padding: 5px 8px 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-secondary-text-color, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.favorite-sidebar-tree__context-divider {
  height: 1px;
  margin: 4px 0;
  background: color-mix(in srgb, var(--ls-border-color, #d7dce5) 70%, transparent 30%);
}

.favorite-sidebar-tree__context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: background-color 100ms ease, color 100ms ease;
}

.favorite-sidebar-tree__context-item:hover,
.favorite-sidebar-tree__context-item:focus-visible {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 12%, transparent 88%);
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__context-item--danger {
  color: #ef4444;
}

.favorite-sidebar-tree__context-item--danger:hover,
.favorite-sidebar-tree__context-item--danger:focus-visible {
  background: color-mix(in srgb, #ef4444 12%, transparent 88%);
  color: #dc2626;
}

.favorite-sidebar-tree__context-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: inherit;
}

.favorite-sidebar-tree__context-label {
  flex: 1 1 auto;
  white-space: nowrap;
}

.favorite-sidebar-tree__context-shortcut {
  font-size: 10px;
  color: var(--ls-secondary-text-color, #6b7280);
  background: color-mix(in srgb, var(--ls-tertiary-background-color, #f5f7fb) 90%, var(--ls-border-color, #d7dce5) 10%);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 60%, transparent 40%);
  margin-left: 8px;
  white-space: nowrap;
}
`

function renderSidebarNotice(state: TreeStateSnapshot, i18n: FavoriteTreeI18n): string {
  if (state.searchQuery || state.refreshing || !state.rootFavorites.length) {
    return ''
  }

  if (state.lastRefreshError) {
    return renderSidebarStatusCard({
      tone: 'error',
      title: i18n.t('refreshFailedTitle'),
      description: i18n.t('refreshFailed', { message: state.lastRefreshError }),
      hint: i18n.t('refreshFailedHint'),
      actions: [
        { action: 'sidebarTreeRefresh', label: i18n.t('manualRefresh') },
        { action: 'sidebarTreeOpenSettings', label: i18n.t('openSettings') },
      ],
    })
  }

  if (!state.hasHierarchyRelations) {
    return renderSidebarStatusCard({
      tone: 'warning',
      title: i18n.t('noHierarchyTitle'),
      description: i18n.t('noHierarchyBody', { property: state.hierarchyProperty }),
      hint: i18n.t('noHierarchyHint'),
      actions: [
        { action: 'sidebarTreeOpenSettings', label: i18n.t('openSettings') },
        { action: 'sidebarTreeRefresh', label: i18n.t('manualRefresh') },
      ],
    })
  }

  return ''
}

function renderSidebarStatusCard(options: {
  title: string
  description?: string
  hint?: string
  tone?: SidebarStatusTone
  actions?: SidebarStatusAction[]
}): string {
  const toneClass = options.tone && options.tone !== 'info' ? ` favorite-sidebar-tree__empty--${options.tone}` : ''
  const descriptionMarkup = options.description
    ? `<div class="favorite-sidebar-tree__empty-body">${escapeHtml(options.description)}</div>`
    : ''
  const hintMarkup = options.hint ? `<div class="favorite-sidebar-tree__empty-hint">${escapeHtml(options.hint)}</div>` : ''
  const actionsMarkup = options.actions?.length
    ? `<div class="favorite-sidebar-tree__empty-actions">${options.actions
        .map(
          (action) =>
            `<button class="favorite-sidebar-tree__text-btn" data-on-click="${action.action}">${escapeHtml(action.label)}</button>`,
        )
        .join('')}</div>`
    : ''

  return `
    <div class="favorite-sidebar-tree__empty${toneClass}">
      <div class="favorite-sidebar-tree__empty-title">${escapeHtml(options.title)}</div>
      ${descriptionMarkup}
      ${hintMarkup}
      ${actionsMarkup}
    </div>
  `
}

function renderSidebarNode(
  title: string,
  depth: number,
  ancestors: string[],
  isLast: boolean,
  state: TreeStateSnapshot,
  accessors: SidebarTreeRenderAccessors,
  i18n: FavoriteTreeI18n,
  normalizedQuery: string,
): string {
  const key = normalizeTitle(title)
  if (!key) {
    return ''
  }
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const isActiveSearchMatch = key === state.currentSearchMatchKey
  const children = accessors.getChildrenFor(title)
  const isSearching = normalizedQuery.length > 0
  const visibleChildren = isSearching
    ? children.filter((childTitle) => isSidebarNodeVisible(childTitle, normalizedQuery, accessors, [...ancestors, key]))
    : children
  const hasChildren = visibleChildren.length > 0
  const isExpanded = state.expandedKeys.has(key)
  const isSearchCollapsed = state.searchCollapsedKeys.has(key)
  const effectiveExpanded = isSearching ? hasChildren && !isSearchCollapsed : isExpanded

  const toggleMarkup = hasChildren
    ? `
      <button
        class="favorite-sidebar-tree__toggle ${effectiveExpanded ? 'is-expanded' : ''}"
        data-on-click="sidebarTreeToggle"
        data-key="${escapeHtml(key)}"
        title="${escapeHtml(i18n.t('toggleNode'))}"
        aria-label="${escapeHtml(i18n.t('toggleNode'))}"
      >
        <span class="favorite-sidebar-tree__caret"></span>
      </button>
    `
    : '<span class="favorite-sidebar-tree__toggle is-placeholder"></span>'

  let childrenMarkup = ''
  if (hasChildren && effectiveExpanded) {
    const nextAncestors = [...ancestors, key]
    childrenMarkup = `
      <div class="favorite-sidebar-tree__children">
        ${visibleChildren.map((childTitle, index) => {
          const childKey = normalizeTitle(childTitle)
          if (nextAncestors.includes(childKey)) {
            return renderSidebarLeaf(childTitle, true, i18n, normalizedQuery)
          }

          return renderSidebarNode(
            childTitle,
            depth + 1,
            nextAncestors,
            index === visibleChildren.length - 1,
            state,
            accessors,
            i18n,
            normalizedQuery,
          )
        }).join('')}
      </div>
    `
  }

  return `
    <div class="favorite-sidebar-tree__node ${depth > 0 ? 'favorite-sidebar-tree__node--child' : ''}" data-node-key="${escapeHtml(key)}" data-is-last="${isLast ? 'true' : 'false'}">
      <div
        id="${sanitizeDomId('row', key)}"
        class="favorite-sidebar-tree__row ${isCurrent ? 'is-current' : ''} ${isActiveSearchMatch ? 'is-search-match-current' : ''}"
        data-page="${escapeHtml(title)}"
        data-parent-key="${escapeHtml(ancestors[ancestors.length - 1] || normalizeTitle(title))}"
        data-key="${escapeHtml(key)}"
        data-has-children="${hasChildren ? 'true' : 'false'}"
        data-has-custom-sort="${Boolean(state.sortOrders[key]?.length) ? 'true' : 'false'}"
        data-is-expanded="${effectiveExpanded ? 'true' : 'false'}"
        data-on-contextmenu="sidebarTreeOpenContextMenu"
        data-prevent-default="true"
        data-rect="true"
      >
        ${toggleMarkup}
        <button
          class="favorite-sidebar-tree__title"
          data-on-click="sidebarTreeOpenPage"
          data-page="${escapeHtml(title)}"
          title="${escapeHtml(i18n.t('openPage', { title }))}"
        >
          <span class="favorite-sidebar-tree__title-text">${renderSidebarHighlightedTitle(title, normalizedQuery)}</span>
          ${isCurrent ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeCurrent'))}</span>` : ''}
          ${isSearching && key.includes(normalizedQuery)
            ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeMatch'))}</span>`
            : ''}
        </button>
        <button
          id="${sanitizeDomId('trigger', key)}"
          class="favorite-sidebar-tree__inline-action has-tooltip"
          data-role="sidebar-context-trigger"
          data-on-click="sidebarTreeOpenContextMenu"
          data-rect="true"
          data-page="${escapeHtml(title)}"
          data-parent-key="${escapeHtml(ancestors[ancestors.length - 1] || normalizeTitle(title))}"
          data-key="${escapeHtml(key)}"
          data-has-children="${hasChildren ? 'true' : 'false'}"
          data-has-custom-sort="${Boolean(state.sortOrders[key]?.length) ? 'true' : 'false'}"
          data-is-expanded="${effectiveExpanded ? 'true' : 'false'}"
          aria-label="${escapeHtml(i18n.t('contextMenuMoreActions'))}"
        >${renderIcon('more', 'favorite-sidebar-tree__icon')}${renderTooltip(i18n.t('contextMenuMoreActions'), 'favorite-sidebar-tree__tooltip')}</button>
        ${renderSidebarSortModeControls(state, key, i18n)}
      </div>
      ${childrenMarkup}
    </div>
  `
}

function renderSidebarSortModeControls(state: TreeStateSnapshot, parentKey: string, i18n: FavoriteTreeI18n): string {
  const customOrder = state.sortOrders[parentKey]
  if (!customOrder?.length) {
    return ''
  }

  const mode = state.sortModes[parentKey] === 'default' ? 'default' : 'custom'
  const switchLabel = mode === 'custom' ? i18n.t('sortModeCustomLabel') : i18n.t('sortModeDefaultLabel')
  const switchTitle = mode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom')
  const badgeLabel = mode === 'custom' ? i18n.t('sortStateCustomActive') : i18n.t('sortStateCustomSaved')

  return `
    <span class="favorite-sidebar-tree__sort-mode">
      <span class="favorite-sidebar-tree__badge">${escapeHtml(badgeLabel)}</span>
      <button
        class="favorite-sidebar-tree__sort-action ${mode === 'custom' ? 'is-active' : ''}"
        data-on-click="sidebarTreeToggleSortMode"
        data-parent-key="${escapeHtml(parentKey)}"
        title="${escapeHtml(switchTitle)}"
      >${escapeHtml(switchLabel)}</button>
      <button
        class="favorite-sidebar-tree__sort-action"
        data-on-click="sidebarTreeClearCustomSort"
        data-parent-key="${escapeHtml(parentKey)}"
        title="${escapeHtml(i18n.t('clearCustomSort'))}"
      >${escapeHtml(i18n.t('clearCustomSort'))}</button>
    </span>
  `
}

function renderSidebarLeaf(title: string, isCycle: boolean, i18n: FavoriteTreeI18n, normalizedQuery: string): string {
  const key = normalizeTitle(title)
  return `
    <div class="favorite-sidebar-tree__node favorite-sidebar-tree__node--child">
      <div
        id="${sanitizeDomId('row', key)}"
        class="favorite-sidebar-tree__row"
        data-page="${escapeHtml(title)}"
        data-parent-key="${escapeHtml(key)}"
        data-key="${escapeHtml(key)}"
        data-has-children="false"
        data-has-custom-sort="false"
        data-is-expanded="false"
        data-on-contextmenu="sidebarTreeOpenContextMenu"
        data-prevent-default="true"
        data-rect="true"
      >
        <span class="favorite-sidebar-tree__toggle is-placeholder"></span>
        <button
          class="favorite-sidebar-tree__title"
          data-on-click="sidebarTreeOpenPage"
          data-page="${escapeHtml(title)}"
          title="${escapeHtml(i18n.t('openPage', { title }))}"
        >
          <span class="favorite-sidebar-tree__title-text">${renderSidebarHighlightedTitle(title, normalizedQuery)}</span>
          ${isCycle ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeCycle'))}</span>` : ''}
        </button>
        <button
          id="${sanitizeDomId('trigger', key)}"
          class="favorite-sidebar-tree__inline-action has-tooltip"
          data-role="sidebar-context-trigger"
          data-on-click="sidebarTreeOpenContextMenu"
          data-rect="true"
          data-page="${escapeHtml(title)}"
          data-parent-key="${escapeHtml(key)}"
          data-key="${escapeHtml(key)}"
          data-has-children="false"
          data-has-custom-sort="false"
          data-is-expanded="false"
          aria-label="${escapeHtml(i18n.t('contextMenuMoreActions'))}"
        >${renderIcon('more', 'favorite-sidebar-tree__icon')}${renderTooltip(i18n.t('contextMenuMoreActions'), 'favorite-sidebar-tree__tooltip')}</button>
      </div>
    </div>
  `
}

function isSidebarNodeVisible(
  title: string,
  normalizedQuery: string,
  accessors: SidebarTreeRenderAccessors,
  ancestors: string[],
): boolean {
  if (!normalizedQuery) {
    return true
  }

  const key = normalizeTitle(title)
  if (!key || ancestors.includes(key)) {
    return false
  }

  if (key.includes(normalizedQuery)) {
    return true
  }

  const nextAncestors = [...ancestors, key]
  return accessors.getChildrenFor(title).some((childTitle) => isSidebarNodeVisible(childTitle, normalizedQuery, accessors, nextAncestors))
}

function renderSidebarHighlightedTitle(title: string | null | undefined, normalizedQuery: string): string {
  if (title == null) {
    return ''
  }
  if (!normalizedQuery) {
    return escapeHtml(title)
  }

  const lowered = title.toLocaleLowerCase()
  const start = lowered.indexOf(normalizedQuery)
  if (start < 0) {
    return escapeHtml(title)
  }

  const end = start + normalizedQuery.length
  return `${escapeHtml(title.slice(0, start))}<mark class="favorite-sidebar-tree__highlight">${escapeHtml(title.slice(start, end))}</mark>${escapeHtml(title.slice(end))}`
}
