import { ROOT_SORT_KEY } from './constants'
import type { FavoriteTreeI18n } from './i18n'
import type { LoadState, TreeStateSnapshot } from './types'
import { escapeHtml, normalizeTitle } from './utils'

type TreeRenderAccessors = {
  getChildrenFor: (title: string) => string[]
}

export function renderFavoriteTree(
  state: TreeStateSnapshot,
  accessors: TreeRenderAccessors,
  i18n: FavoriteTreeI18n,
): string {
  if (state.viewMode === 'bubble') {
    const countLabel = state.rootFavorites.length > 99 ? '99+' : String(state.rootFavorites.length)
    return `
      <button
        class="favorite-tree-bubble ${state.refreshing ? 'is-refreshing' : ''}"
        data-action="expand-panel"
        data-drag-handle="bubble"
        title="${escapeHtml(i18n.t('bubbleExpandTitle'))}"
        aria-label="${escapeHtml(i18n.t('bubbleExpandAria'))}"
      >
        <span class="favorite-tree-bubble__icon">★</span>
        <span class="favorite-tree-bubble__count">${escapeHtml(countLabel)}</span>
      </button>
    `
  }

  const autoRefreshActionLabel = state.autoRefreshPaused ? i18n.t('resumeAutoRefresh') : i18n.t('pauseAutoRefresh')
  const autoRefreshActionIcon = state.autoRefreshPaused ? '▶' : '⏸'
  const autoRefreshState = state.autoRefreshPaused
    ? i18n.t('autoRefreshPaused')
    : i18n.t('autoRefreshEverySeconds', { seconds: state.pollIntervalSeconds })
  const hasExpandedNodes = state.expandedKeys.size > 0
  const expandActionLabel = hasExpandedNodes ? i18n.t('collapseLabel') : i18n.t('expandLabel')
  const expandActionTitle = hasExpandedNodes ? i18n.t('collapseAllTitle') : i18n.t('expandAllTitle')
  const controlsToggleLabel = state.controlsCollapsed ? '▾' : '▴'
  const controlsToggleTitle = state.controlsCollapsed ? i18n.t('expandControlsTitle') : i18n.t('collapseControlsTitle')
  const normalizedQuery = normalizeTitle(state.searchQuery)
  const isSearching = normalizedQuery.length > 0

  const visibleRoots = isSearching
    ? state.rootFavorites.filter((title) => isNodeVisible(title, normalizedQuery, accessors, []))
    : state.rootFavorites

  const rootMarkup = visibleRoots.length
    ? visibleRoots.map((title) => renderNode(title, 0, [], null, state, accessors, normalizedQuery, i18n)).join('')
    : ''

  const breadcrumbMarkup = renderBreadcrumbs(state, i18n)
  const infoTooltip = i18n.t('infoTooltip', { property: state.hierarchyProperty })
  const searchMarkup = `
    <div class="favorite-tree__searchbar">
      <input
        class="favorite-tree__search-input"
        data-role="search-input"
        type="search"
        value="${escapeHtml(state.searchQuery)}"
        placeholder="${escapeHtml(i18n.t('searchPlaceholder'))}"
        spellcheck="false"
      />
    </div>
  `
  const toolbarMarkup = `
    <div class="favorite-tree__toolbar">
      <button class="favorite-tree__text-btn" data-action="locate-current" title="${escapeHtml(i18n.t('locateTitle'))}">${escapeHtml(i18n.t('locateLabel'))}</button>
      <button class="favorite-tree__text-btn" data-action="reset-panel-size" title="${escapeHtml(i18n.t('resetPanelSizeTitle'))}">${escapeHtml(i18n.t('resetPanelSizeLabel'))}</button>
      <button class="favorite-tree__text-btn ${hasExpandedNodes ? 'is-active' : ''}" data-action="toggle-expand-all" title="${expandActionTitle}">${expandActionLabel}</button>
      <button
        class="favorite-tree__text-btn ${state.autoRefreshPaused ? 'is-active' : ''}"
        data-action="toggle-auto-refresh"
        title="${autoRefreshActionLabel}"
        aria-pressed="${state.autoRefreshPaused ? 'true' : 'false'}"
      >${autoRefreshActionIcon} ${escapeHtml(i18n.t('autoRefreshLabel'))}</button>
    </div>
  `
  const controlsMarkup = state.controlsCollapsed
    ? ''
    : `
      <div class="favorite-tree__controls">
        ${searchMarkup}
        ${breadcrumbMarkup}
        ${toolbarMarkup}
      </div>
    `

  const bodyMarkup = state.searching && isSearching
    ? `<div class="favorite-tree__status">${escapeHtml(i18n.t('searchIndexing'))}</div>`
    : state.refreshing && !state.rootFavorites.length
    ? `<div class="favorite-tree__status">${escapeHtml(i18n.t('loadingFavorites'))}</div>`
    : isSearching && !visibleRoots.length
    ? `<div class="favorite-tree__status">${escapeHtml(i18n.t('noMatches'))}</div>`
    : state.rootFavorites.length
    ? rootMarkup
    : `<div class="favorite-tree__status">${escapeHtml(i18n.t('noFavorites'))}</div>`

  return `
    <div class="favorite-tree">
      <div class="favorite-tree__header" data-drag-handle="panel" title="${escapeHtml(i18n.t('panelHeaderTitle'))}">
        <div class="favorite-tree__header-main">
          <div class="favorite-tree__title-row">
            <h1 class="favorite-tree__title">${escapeHtml(i18n.t('panelTitle'))}</h1>
            <span class="favorite-tree__info" data-no-drag="true" tabindex="0" role="button" aria-label="${escapeHtml(i18n.t('panelInfoAria'))}">
              <span class="favorite-tree__info-icon">i</span>
              <span class="favorite-tree__tooltip" role="tooltip">${escapeHtml(infoTooltip)}</span>
            </span>
          </div>
        </div>
        <div class="favorite-tree__actions">
          <button
            class="favorite-tree__icon-btn ${state.controlsCollapsed ? 'is-active' : ''}"
            data-action="toggle-controls"
            title="${controlsToggleTitle}"
            aria-label="${controlsToggleTitle}"
            aria-expanded="${state.controlsCollapsed ? 'false' : 'true'}"
          >${controlsToggleLabel}</button>
          <button class="favorite-tree__icon-btn" data-action="refresh" title="${escapeHtml(i18n.t('manualRefresh'))}">↻</button>
          <button class="favorite-tree__icon-btn" data-action="collapse-to-bubble" title="${escapeHtml(i18n.t('collapseToBubble'))}">○</button>
          <button class="favorite-tree__icon-btn" data-action="settings" title="${escapeHtml(i18n.t('openSettings'))}">⚙</button>
          <button class="favorite-tree__icon-btn" data-action="close" title="${escapeHtml(i18n.t('hidePlugin'))}">×</button>
        </div>
      </div>
      ${controlsMarkup}
      <div class="favorite-tree__body">${bodyMarkup}</div>
      <div class="favorite-tree__footer">
        <span>${escapeHtml(state.lastRefreshLabel)}</span>
        <span>${state.refreshing ? escapeHtml(i18n.t('refreshing')) : `${escapeHtml(autoRefreshState)} · ${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}`}</span>
      </div>
      <div class="favorite-tree__resize-handle" data-drag-handle="panel-resize" title="${escapeHtml(i18n.t('resizePanel'))}"></div>
    </div>
  `
}

function renderNode(
  title: string,
  depth: number,
  ancestors: string[],
  parentKey: string | null,
  state: TreeStateSnapshot,
  accessors: TreeRenderAccessors,
  normalizedQuery: string,
  i18n: FavoriteTreeI18n,
): string {
  const key = normalizeTitle(title)
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const isLocated = key === state.lastLocatedNodeKey
  const isFlashing = key === state.flashLocatedNodeKey
  const isExpanded = state.expandedKeys.has(key)
  const loadState = state.loadStates.get(key) ?? 'idle'
  const children = accessors.getChildrenFor(title)
  const isSearching = normalizedQuery.length > 0
  const visibleChildren = isSearching
    ? children.filter((childTitle) => isNodeVisible(childTitle, normalizedQuery, accessors, [...ancestors, key]))
    : children
  const hasKnownChildren = visibleChildren.length > 0
  const effectiveExpanded = isSearching ? hasKnownChildren : isExpanded
  const statusHint = renderNodeHint(key, depth, effectiveExpanded, loadState, hasKnownChildren, state, i18n)
  const sortParentKey = parentKey ?? ROOT_SORT_KEY
  const sortItemId = buildSortItemId(sortParentKey, key)
  const sortHandleMarkup = isSearching
    ? '<span class="tree-node__sort-placeholder"></span>'
    : `
      <button
        class="tree-node__sort-handle"
        data-no-drag="true"
        data-sort-handle="true"
        data-sort-item-id="${escapeHtml(sortItemId)}"
        data-sort-parent-key="${escapeHtml(sortParentKey)}"
        data-sort-title="${escapeHtml(title)}"
        draggable="true"
        title="${escapeHtml(i18n.t('dragSort'))}"
        aria-label="${escapeHtml(i18n.t('dragSort'))}"
      >⋮⋮</button>
    `

  let childrenMarkup = ''
  if (effectiveExpanded && loadState !== 'loading' && loadState !== 'error' && hasKnownChildren) {
    const nextAncestors = [...ancestors, key]
    childrenMarkup = `<div class="tree-node__children">${visibleChildren
      .map((childTitle) => {
        const childKey = normalizeTitle(childTitle)
        if (nextAncestors.includes(childKey)) {
          return renderCycleNode(childTitle, depth + 1, i18n)
        }
        return renderNode(childTitle, depth + 1, nextAncestors, key, state, accessors, normalizedQuery, i18n)
      })
      .join('')}</div>`
  }

  const chevron = effectiveExpanded ? '▾' : '▸'
  const toggleMarkup = isSearching
    ? `<span class="tree-node__toggle is-passive">${hasKnownChildren ? chevron : '•'}</span>`
    : `<button class="tree-node__toggle" data-action="toggle-node" data-key="${escapeHtml(key)}" title="${escapeHtml(i18n.t('toggleNode'))}">${chevron}</button>`

  return `
    <div class="tree-node" data-node-key="${escapeHtml(key)}">
      <div
        class="tree-node__row ${isCurrent ? 'is-current' : ''} ${isLocated ? 'is-located' : ''} ${isFlashing ? 'is-flashing' : ''}"
        style="--depth:${depth}"
        data-sort-item-id="${escapeHtml(sortItemId)}"
        data-sort-parent-key="${escapeHtml(sortParentKey)}"
        data-sort-title="${escapeHtml(title)}"
      >
        ${toggleMarkup}
        ${sortHandleMarkup}
        <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="${escapeHtml(i18n.t('openPage', { title }))}">
          <span class="tree-node__title-text">${renderHighlightedTitle(title, normalizedQuery)}</span>
        </button>
        <span class="tree-node__meta">${isCurrent ? `<span class="tree-node__badge">${escapeHtml(i18n.t('badgeCurrent'))}</span>` : ''}${isLocated ? `<span class="tree-node__badge">${escapeHtml(i18n.t('badgeLocated'))}</span>` : ''}${isSearching && key.includes(normalizedQuery) ? `<span class="tree-node__badge">${escapeHtml(i18n.t('badgeMatch'))}</span>` : ''}</span>
      </div>
      ${statusHint}
      ${childrenMarkup}
    </div>
  `
}

function renderCycleNode(title: string, depth: number, i18n: FavoriteTreeI18n): string {
  return `
    <div class="tree-node" data-node-key="${escapeHtml(normalizeTitle(title))}">
      <div class="tree-node__row is-cycle" style="--depth:${depth}">
        <span class="tree-node__toggle">•</span>
        <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="${escapeHtml(i18n.t('openPage', { title }))}">
          <span class="tree-node__title-text">${escapeHtml(title)}</span>
        </button>
        <span class="tree-node__meta"><span class="tree-node__badge">${escapeHtml(i18n.t('badgeCycle'))}</span></span>
      </div>
      <div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(i18n.t('cycleHint'))}</div>
    </div>
  `
}

function renderNodeHint(
  key: string,
  depth: number,
  isExpanded: boolean,
  loadState: LoadState,
  hasKnownChildren: boolean,
  state: TreeStateSnapshot,
  i18n: FavoriteTreeI18n,
): string {
  if (state.searchQuery) {
    return ''
  }

  if (!isExpanded) {
    return ''
  }

  if (loadState === 'loading') {
    return `<div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(i18n.t('loadingChildren'))}</div>`
  }

  if (loadState === 'error') {
    const message = state.loadErrors.get(key) ?? i18n.t('loadChildrenFailed')
    return `<div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(message)}</div>`
  }

  if (state.loadedKeys.has(key) && !hasKnownChildren) {
    return `<div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(i18n.t('noDirectChildren'))}</div>`
  }

  return ''
}

function renderBreadcrumbs(state: TreeStateSnapshot, i18n: FavoriteTreeI18n): string {
  if (state.currentPagePath.length > 0) {
    const items = state.currentPagePath
      .map((title, index) => {
        const isLast = index === state.currentPagePath.length - 1
        return `
          <button
            class="favorite-tree__breadcrumb ${isLast ? 'is-current' : ''}"
            data-action="open-page"
            data-page="${escapeHtml(title)}"
            title="${escapeHtml(i18n.t('openPage', { title }))}"
          >${escapeHtml(title)}</button>
        `
      })
      .join('<span class="favorite-tree__breadcrumb-separator">/</span>')

    return `<div class="favorite-tree__breadcrumbs">${items}</div>`
  }

  if (state.currentPageName) {
    return `<div class="favorite-tree__breadcrumbs is-muted">${escapeHtml(i18n.t('currentPageNotInTree'))}</div>`
  }

  return ''
}

function isNodeVisible(
  title: string,
  normalizedQuery: string,
  accessors: TreeRenderAccessors,
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
  return accessors.getChildrenFor(title).some((childTitle) => isNodeVisible(childTitle, normalizedQuery, accessors, nextAncestors))
}

function renderHighlightedTitle(title: string, normalizedQuery: string): string {
  if (!normalizedQuery) {
    return escapeHtml(title)
  }

  const lowered = title.toLocaleLowerCase()
  const start = lowered.indexOf(normalizedQuery)
  if (start < 0) {
    return escapeHtml(title)
  }

  const end = start + normalizedQuery.length
  return `${escapeHtml(title.slice(0, start))}<mark class="tree-node__highlight">${escapeHtml(title.slice(start, end))}</mark>${escapeHtml(title.slice(end))}`
}

function buildSortItemId(parentKey: string, itemKey: string): string {
  return `${parentKey}::${itemKey}`
}
