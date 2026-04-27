import type { FavoriteTreeI18n } from './i18n'
import { renderIcon } from './render'
import type { TreeStateSnapshot } from './types'
import { escapeHtml, normalizeTitle } from './utils'

type SidebarTreeRenderAccessors = {
  getChildrenFor: (title: string) => string[]
}

export function renderSidebarTree(
  state: TreeStateSnapshot,
  accessors: SidebarTreeRenderAccessors,
  i18n: FavoriteTreeI18n,
): string {
  const autoRefreshActionLabel = state.autoRefreshPaused ? i18n.t('resumeAutoRefresh') : i18n.t('pauseAutoRefresh')
  const autoRefreshActionIcon = state.autoRefreshPaused
    ? renderIcon('play', 'favorite-sidebar-tree__icon favorite-sidebar-tree__icon--sm')
    : renderIcon('pause', 'favorite-sidebar-tree__icon favorite-sidebar-tree__icon--sm')
  const autoRefreshState = state.autoRefreshPaused
    ? i18n.t('autoRefreshPaused')
    : i18n.t('autoRefreshEverySeconds', { seconds: state.pollIntervalSeconds })
  const hasExpandedNodes = state.expandedKeys.size > 0
  const expandActionLabel = hasExpandedNodes ? i18n.t('collapseLabel') : i18n.t('expandLabel')
  const expandActionTitle = hasExpandedNodes ? i18n.t('collapseAllTitle') : i18n.t('expandAllTitle')
  const controlsToggleTitle = state.controlsCollapsed ? i18n.t('expandControlsTitle') : i18n.t('collapseControlsTitle')
  const controlsToggleLabel = state.controlsCollapsed
    ? renderIcon('panel-controls-open', 'favorite-sidebar-tree__icon')
    : renderIcon('panel-controls-close', 'favorite-sidebar-tree__icon')
  const normalizedQuery = normalizeTitle(state.searchQuery)
  const isSearching = normalizedQuery.length > 0
  const visibleRoots = isSearching
    ? state.rootFavorites.filter((title) => isSidebarNodeVisible(title, normalizedQuery, accessors, []))
    : state.rootFavorites
  const content = state.searching && isSearching
    ? `<div class="favorite-sidebar-tree__empty">${escapeHtml(i18n.t('searchIndexing'))}</div>`
    : isSearching && !visibleRoots.length
    ? `<div class="favorite-sidebar-tree__empty">${escapeHtml(i18n.t('noMatches'))}</div>`
    : state.rootFavorites.length > 0
    ? visibleRoots
      .map((title, index) => renderSidebarNode(title, 0, [], index === visibleRoots.length - 1, state, accessors, i18n, normalizedQuery))
      .join('')
    : `<div class="favorite-sidebar-tree__empty">${escapeHtml(state.refreshing ? i18n.t('loadingFavorites') : i18n.t('noFavorites'))}</div>`
  const controlsMarkup = state.controlsCollapsed
    ? ''
    : `
      <div class="favorite-sidebar-tree__controls">
        <div class="favorite-sidebar-tree__searchbar">
          <input
            class="favorite-sidebar-tree__search-input"
            data-role="sidebar-search-input"
            type="search"
            value="${escapeHtml(state.searchQuery)}"
            placeholder="${escapeHtml(i18n.t('searchPlaceholder'))}"
            spellcheck="false"
          />
        </div>
        <div class="favorite-sidebar-tree__toolbar">
          <button
            class="favorite-sidebar-tree__text-btn"
            data-on-click="sidebarTreeLocateCurrent"
            title="${escapeHtml(i18n.t('locateTitle'))}"
          >${escapeHtml(i18n.t('locateLabel'))}</button>
          <button
            class="favorite-sidebar-tree__text-btn"
            data-on-click="sidebarTreeResetPanelSize"
            title="${escapeHtml(i18n.t('resetPanelSizeTitle'))}"
          >${escapeHtml(i18n.t('resetPanelSizeLabel'))}</button>
          <button
            class="favorite-sidebar-tree__text-btn ${hasExpandedNodes ? 'is-active' : ''}"
            data-on-click="sidebarTreeToggleExpandAll"
            title="${escapeHtml(expandActionTitle)}"
          >${escapeHtml(expandActionLabel)}</button>
          <button
            class="favorite-sidebar-tree__text-btn ${state.autoRefreshPaused ? 'is-active' : ''}"
            data-on-click="sidebarTreeToggleAutoRefresh"
            title="${escapeHtml(autoRefreshActionLabel)}"
            aria-pressed="${state.autoRefreshPaused ? 'true' : 'false'}"
          >${autoRefreshActionIcon}${escapeHtml(i18n.t('autoRefreshLabel'))}</button>
        </div>
        <div class="favorite-sidebar-tree__meta">
          <span>${escapeHtml(state.lastRefreshLabel)}</span>
          <span>${state.refreshing ? escapeHtml(i18n.t('refreshing')) : `${escapeHtml(autoRefreshState)} · ${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}`}</span>
        </div>
      </div>
    `

  return `
    <section class="favorite-sidebar-tree" data-favorite-sidebar-tree="true">
      <div class="favorite-sidebar-tree__header">
        <div class="favorite-sidebar-tree__header-main">
          <span class="favorite-sidebar-tree__heading">${escapeHtml(i18n.t('panelTitle'))}</span>
          <span class="favorite-sidebar-tree__count">${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}</span>
        </div>
        <div class="favorite-sidebar-tree__actions">
          <button
            class="favorite-sidebar-tree__icon-btn"
            data-on-click="sidebarTreeShowFloating"
            title="${escapeHtml(i18n.t('switchToFloating'))}"
            aria-label="${escapeHtml(i18n.t('switchToFloating'))}"
          >${renderIcon('panel-controls-open', 'favorite-sidebar-tree__icon')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn ${state.controlsCollapsed ? 'is-active' : ''}"
            data-on-click="sidebarTreeToggleControls"
            title="${escapeHtml(controlsToggleTitle)}"
            aria-label="${escapeHtml(controlsToggleTitle)}"
            aria-expanded="${state.controlsCollapsed ? 'false' : 'true'}"
          >${controlsToggleLabel}</button>
          <button
            class="favorite-sidebar-tree__icon-btn"
            data-on-click="sidebarTreeRefresh"
            title="${escapeHtml(i18n.t('manualRefresh'))}"
            aria-label="${escapeHtml(i18n.t('manualRefresh'))}"
          >${renderIcon('refresh', 'favorite-sidebar-tree__icon')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn"
            data-on-click="sidebarTreeCollapseToBubble"
            title="${escapeHtml(i18n.t('collapseToBubble'))}"
            aria-label="${escapeHtml(i18n.t('collapseToBubble'))}"
          >${renderIcon('panel-to-bubble', 'favorite-sidebar-tree__icon')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn"
            data-on-click="sidebarTreeOpenSettings"
            title="${escapeHtml(i18n.t('openSettings'))}"
            aria-label="${escapeHtml(i18n.t('openSettings'))}"
          >${renderIcon('sliders', 'favorite-sidebar-tree__icon')}</button>
          <button
            class="favorite-sidebar-tree__icon-btn"
            data-on-click="sidebarTreeClose"
            title="${escapeHtml(i18n.t('hidePlugin'))}"
            aria-label="${escapeHtml(i18n.t('hidePlugin'))}"
          >${renderIcon('close', 'favorite-sidebar-tree__icon')}</button>
        </div>
      </div>
      ${controlsMarkup}
      <div class="favorite-sidebar-tree__body">
        ${content}
      </div>
    </section>
  `
}

export const SIDEBAR_TREE_HOST_STYLE = `
.favorite-sidebar-tree {
  margin: 8px 0 10px;
  padding: 0 0 2px;
  color: var(--ls-primary-text-color, #1f2937);
}

.favorite-sidebar-tree__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 12px 6px;
  font-size: 12px;
  line-height: 1.35;
}

.favorite-sidebar-tree__header-main {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.favorite-sidebar-tree__heading {
  font-weight: 700;
}

.favorite-sidebar-tree__count {
  color: var(--ls-secondary-text-color, #6b7280);
  white-space: nowrap;
}

.favorite-sidebar-tree__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
}

.favorite-sidebar-tree__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ls-secondary-text-color, #6b7280);
  cursor: pointer;
}

.favorite-sidebar-tree__icon-btn:hover {
  background: var(--ls-tertiary-background-color, #f5f7fb);
  color: var(--ls-primary-text-color, #1f2937);
}

.favorite-sidebar-tree__icon-btn.is-active {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 10%, transparent 90%);
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__controls {
  padding: 0 12px 8px;
}

.favorite-sidebar-tree__searchbar {
  margin-bottom: 8px;
}

.favorite-sidebar-tree__search-input {
  width: 100%;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 72%, transparent 28%);
  border-radius: 8px;
  background: var(--ls-primary-background-color, #ffffff);
  color: var(--ls-primary-text-color, #1f2937);
  font-size: 12px;
  line-height: 1.4;
}

.favorite-sidebar-tree__search-input::placeholder {
  color: var(--ls-secondary-text-color, #6b7280);
}

.favorite-sidebar-tree__search-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 58%, transparent 42%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ls-link-text-color, #2563eb) 12%, transparent 88%);
}

.favorite-sidebar-tree__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.favorite-sidebar-tree__text-btn {
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
}

.favorite-sidebar-tree__text-btn:hover {
  color: var(--ls-primary-text-color, #1f2937);
}

.favorite-sidebar-tree__text-btn.is-active {
  color: var(--ls-link-text-color, #2563eb);
}

.favorite-sidebar-tree__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 11px;
  line-height: 1.4;
}

.favorite-sidebar-tree__icon {
  width: 14px;
  height: 14px;
}

.favorite-sidebar-tree__icon--sm {
  width: 12px;
  height: 12px;
}

.favorite-sidebar-tree__body {
  font-size: 13px;
}

.favorite-sidebar-tree__node {
  position: relative;
}

.favorite-sidebar-tree__node--child > .favorite-sidebar-tree__row::before {
  content: "";
  position: absolute;
  left: -13px;
  top: 50%;
  width: 13px;
  border-top: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 78%, transparent 22%);
  transform: translateY(-0.5px);
}

.favorite-sidebar-tree__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 2px 12px 2px 4px;
  border-radius: 6px;
}

.favorite-sidebar-tree__row:hover {
  background: var(--ls-tertiary-background-color, #f5f7fb);
}

.favorite-sidebar-tree__row.is-current {
  background: color-mix(in srgb, var(--ls-link-text-color, #2563eb) 9%, transparent 91%);
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

.favorite-sidebar-tree__children {
  margin-left: 18px;
  padding-left: 10px;
  border-left: 1px solid color-mix(in srgb, var(--ls-border-color, #d7dce5) 58%, transparent 42%);
}

.favorite-sidebar-tree__empty {
  padding: 4px 12px;
  color: var(--ls-secondary-text-color, #6b7280);
  font-size: 12px;
  line-height: 1.5;
}
`

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
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const children = accessors.getChildrenFor(title)
  const isSearching = normalizedQuery.length > 0
  const visibleChildren = isSearching
    ? children.filter((childTitle) => isSidebarNodeVisible(childTitle, normalizedQuery, accessors, [...ancestors, key]))
    : children
  const hasChildren = visibleChildren.length > 0
  const isExpanded = state.expandedKeys.has(key)
  const effectiveExpanded = isSearching ? hasChildren : isExpanded

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
      <div class="favorite-sidebar-tree__row ${isCurrent ? 'is-current' : ''}">
        ${toggleMarkup}
        <button
          class="favorite-sidebar-tree__title"
          data-on-click="sidebarTreeOpenPage"
          data-page="${escapeHtml(title)}"
          title="${escapeHtml(i18n.t('openPage', { title }))}"
        >
          <span class="favorite-sidebar-tree__title-text">${renderSidebarHighlightedTitle(title, normalizedQuery)}</span>
          ${isCurrent ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeCurrent'))}</span>` : ''}
        </button>
      </div>
      ${childrenMarkup}
    </div>
  `
}

function renderSidebarLeaf(title: string, isCycle: boolean, i18n: FavoriteTreeI18n, normalizedQuery: string): string {
  return `
    <div class="favorite-sidebar-tree__node favorite-sidebar-tree__node--child">
      <div class="favorite-sidebar-tree__row">
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

function renderSidebarHighlightedTitle(title: string, normalizedQuery: string): string {
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
