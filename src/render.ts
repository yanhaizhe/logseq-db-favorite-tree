import { ROOT_SORT_KEY } from './constants'
import type { FavoriteTreeI18n } from './i18n'
import type { LoadState, SortMode, TreeStateSnapshot } from './types'
import { escapeHtml, normalizeTitle } from './utils'

type TreeRenderAccessors = {
  getChildrenFor: (title: string) => string[]
}

type StatusTone = 'info' | 'warning' | 'error'

type StatusAction = {
  action: 'refresh' | 'settings'
  label: string
}

type CreateChildComposerState = {
  parentTitle: string
  draftTitle: string
}

type IconName =
  | 'bubble'
  | 'play'
  | 'pause'
  | 'panel-controls-open'
  | 'panel-controls-close'
  | 'chevron-down'
  | 'chevron-right'
  | 'refresh'
  | 'panel-to-bubble'
  | 'sliders'
  | 'close'
  | 'dot'
  | 'grip'
  | 'info'
  | 'search'
  | 'locate'
  | 'sidebar'
  | 'child-plus'
  | 'right-sidebar'
  | 'floating'
  | 'expand-tree'
  | 'collapse-tree'

export function renderIcon(name: IconName, className = 'ft-icon'): string {
  const attrs = `class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"`

  switch (name) {
    case 'bubble':
      return `
        <svg ${attrs}>
          <path d="M3.75 8A2.25 2.25 0 0 1 6 5.75h3.62l1.63 1.63c.28.28.66.44 1.06.44H18A2.25 2.25 0 0 1 20.25 10v7A2.25 2.25 0 0 1 18 19.25H6A2.25 2.25 0 0 1 3.75 17V8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 9.75v5.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M12 11.25H8.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M12 11.25h3.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M12 15h-2.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="8.75" cy="11.25" r="1" fill="currentColor"/>
          <circle cx="15.25" cy="11.25" r="1" fill="currentColor"/>
          <circle cx="9.75" cy="15" r="1" fill="currentColor"/>
          <path d="M18.5 13.8l.55 1.1 1.22.18-.89.86.21 1.21-1.09-.57-1.09.57.21-1.21-.89-.86 1.22-.18.55-1.1Z" fill="currentColor"/>
        </svg>
      `
    case 'play':
      return `
        <svg ${attrs}>
          <path d="M9 7.75v8.5l7-4.25-7-4.25Z" fill="currentColor"/>
        </svg>
      `
    case 'pause':
      return `
        <svg ${attrs}>
          <rect x="8" y="7.5" width="3" height="9" rx="1" fill="currentColor"/>
          <rect x="13" y="7.5" width="3" height="9" rx="1" fill="currentColor"/>
        </svg>
      `
    case 'panel-controls-open':
      return `
        <svg ${attrs}>
          <rect x="5" y="5.5" width="14" height="13" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M7.5 9h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M9 13.5 12 10.5l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    case 'panel-controls-close':
      return `
        <svg ${attrs}>
          <rect x="5" y="5.5" width="14" height="13" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M7.5 9h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M9 11.5 12 14.5l3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    case 'chevron-down':
      return `
        <svg ${attrs}>
          <path d="M7.5 9.5 12 14l4.5-4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    case 'chevron-right':
      return `
        <svg ${attrs}>
          <path d="m10 7.5 4.5 4.5-4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    case 'refresh':
      return `
        <svg ${attrs}>
          <path d="M18.5 8.5V5.75h-2.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M18.1 12a6.1 6.1 0 1 1-1.8-4.3l2.2 2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
    case 'panel-to-bubble':
      return `
        <svg ${attrs}>
          <rect x="4.75" y="5.5" width="10.5" height="8" rx="2.2" stroke="currentColor" stroke-width="1.6"/>
          <path d="M13.5 13.25 16.25 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="18" cy="18" r="2.25" stroke="currentColor" stroke-width="1.6"/>
        </svg>
      `
    case 'sliders':
      return `
        <svg ${attrs}>
          <path d="M6 7.5h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M6 12h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M6 16.5h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <circle cx="9" cy="7.5" r="2" fill="var(--ft-bg, white)" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="15" cy="12" r="2" fill="var(--ft-bg, white)" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="11" cy="16.5" r="2" fill="var(--ft-bg, white)" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `
    case 'close':
      return `
        <svg ${attrs}>
          <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      `
    case 'dot':
      return `
        <svg ${attrs}>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      `
    case 'grip':
      return `
        <svg ${attrs}>
          <circle cx="9" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="15" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.2" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.2" fill="currentColor"/>
          <circle cx="9" cy="16" r="1.2" fill="currentColor"/>
          <circle cx="15" cy="16" r="1.2" fill="currentColor"/>
        </svg>
      `
    case 'info':
      return `
        <svg ${attrs}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="1" fill="currentColor"/>
          <path d="M12 11v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      `
    case 'search':
      return `
        <svg ${attrs}>
          <circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" stroke-width="1.8"/>
          <path d="m15 15 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `
    case 'locate':
      return `
        <svg ${attrs}>
          <circle cx="12" cy="12" r="4.25" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 4.5v2.25M12 17.25v2.25M19.5 12h-2.25M6.75 12H4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="1.15" fill="currentColor"/>
        </svg>
      `
    case 'sidebar':
      return `
        <svg ${attrs}>
          <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="2.4" stroke="currentColor" stroke-width="1.6"/>
          <path d="M9 5.75v12.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M12 9.25h4.25M12 12h3.25M12 14.75h4.25" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      `
    case 'child-plus':
      return `
        <svg ${attrs}>
          <path d="M7.75 8.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7.75 12h8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7.75 15.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M17 7.5v5M14.5 10h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `
    case 'right-sidebar':
      return `
        <svg ${attrs}>
          <rect x="4.75" y="5.25" width="14.5" height="13.5" rx="2.4" stroke="currentColor" stroke-width="1.6"/>
          <path d="M15 5.75v12.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M7.75 9.25H12M7.75 12h3.25M7.75 14.75H12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      `
    case 'floating':
      return `
        <svg ${attrs}>
          <rect x="5" y="6" width="11.5" height="8.75" rx="2.2" stroke="currentColor" stroke-width="1.6"/>
          <path d="M14.5 14.5 17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="18.25" cy="18.25" r="2" stroke="currentColor" stroke-width="1.6"/>
          <path d="M7.75 8.75h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M7.75 11.25h4.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `
    case 'expand-tree':
      return `
        <svg ${attrs}>
          <path d="M7 6.75h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7 11.75h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7 16.75h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M16.25 7.5v4.5M14 9.75h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `
    case 'collapse-tree':
      return `
        <svg ${attrs}>
          <path d="M7 6.75h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7 11.75h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M7 16.75h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M14 9.75h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      `
  }
}

export function renderTooltip(label: string, className = 'ft-ui-tooltip'): string {
  return `<span class="${className}" role="tooltip">${escapeHtml(label)}</span>`
}

function renderCreateChildComposer(state: CreateChildComposerState, i18n: FavoriteTreeI18n): string {
  return `
    <div class="favorite-tree__create-child-composer">
      <div class="favorite-tree__create-child-copy">
        <span class="favorite-tree__create-child-title">${escapeHtml(i18n.t('createChildPageForParent', { title: state.parentTitle }))}</span>
        <span class="favorite-tree__create-child-hint">${escapeHtml(i18n.t('createChildInputHint', { parent: state.parentTitle }))}</span>
      </div>
      <div class="favorite-tree__create-child-controls">
        <input
          class="favorite-tree__create-child-input"
          data-role="create-child-input"
          type="text"
          value="${escapeHtml(state.draftTitle)}"
          placeholder="${escapeHtml(i18n.t('createChildInputPlaceholder'))}"
          spellcheck="false"
        />
        <button class="favorite-tree__text-btn" data-action="submit-create-child">${escapeHtml(i18n.t('createChildSubmit'))}</button>
        <button class="favorite-tree__text-btn" data-action="cancel-create-child">${escapeHtml(i18n.t('createChildCancel'))}</button>
      </div>
    </div>
  `
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
        <span class="favorite-tree-bubble__icon">${renderIcon('bubble')}</span>
        <span class="favorite-tree-bubble__count">${escapeHtml(countLabel)}</span>
      </button>
    `
  }

  const autoRefreshActionLabel = state.autoRefreshPaused ? i18n.t('resumeAutoRefresh') : i18n.t('pauseAutoRefresh')
  const autoRefreshActionIcon = state.autoRefreshPaused ? renderIcon('play', 'ft-icon ft-icon--sm') : renderIcon('pause', 'ft-icon ft-icon--sm')
  const autoRefreshState = state.autoRefreshPaused
    ? i18n.t('autoRefreshPaused')
    : i18n.t('autoRefreshEverySeconds', { seconds: state.pollIntervalSeconds })
  const hasExpandedNodes = state.expandedKeys.size > 0
  const expandActionLabel = hasExpandedNodes ? i18n.t('collapseLabel') : i18n.t('expandLabel')
  const expandActionTitle = hasExpandedNodes ? i18n.t('collapseAllTitle') : i18n.t('expandAllTitle')
  const expandActionIcon = hasExpandedNodes ? renderIcon('collapse-tree', 'ft-icon ft-icon--sm') : renderIcon('expand-tree', 'ft-icon ft-icon--sm')
  const controlsToggleLabel = state.controlsCollapsed
    ? renderIcon('panel-controls-open', 'ft-icon ft-icon--sm')
    : renderIcon('panel-controls-close', 'ft-icon ft-icon--sm')
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
  const infoTooltip = `${i18n.t('infoTooltip', { property: state.hierarchyProperty })}${
    state.perfSummary ? `\n${state.perfSummary}` : ''
  }`
  const searchMarkup = `
    <div class="favorite-tree__searchbar">
      <div class="favorite-tree__search-shell">
        <span class="favorite-tree__search-icon">${renderIcon('search', 'ft-icon ft-icon--sm')}</span>
        <input
          class="favorite-tree__search-input"
          data-role="search-input"
          type="search"
          value="${escapeHtml(state.searchQuery)}"
          placeholder="${escapeHtml(i18n.t('searchPlaceholder'))}"
          spellcheck="false"
        />
      </div>
      ${isSearching && state.searchMatchCount > 0
        ? `
          <div class="favorite-tree__search-nav">
            <button class="favorite-tree__text-btn has-tooltip" data-action="search-prev-match" aria-label="${escapeHtml(i18n.t('searchPrevMatch'))}">
              ${escapeHtml(i18n.t('searchPrevMatch'))}
              ${renderTooltip(i18n.t('searchPrevMatch'))}
            </button>
            <span class="favorite-tree__search-nav-count">${escapeHtml(
              i18n.t('searchMatchPosition', {
                current: state.currentSearchMatchNumber,
                total: state.searchMatchCount,
              }),
            )}</span>
            <button class="favorite-tree__text-btn has-tooltip" data-action="search-next-match" aria-label="${escapeHtml(i18n.t('searchNextMatch'))}">
              ${escapeHtml(i18n.t('searchNextMatch'))}
              ${renderTooltip(i18n.t('searchNextMatch'))}
            </button>
          </div>
        `
        : ''}
    </div>
  `
  const createChildMarkup = state.createChildDraftParent
    ? renderCreateChildComposer(
        {
          parentTitle: state.createChildDraftParent,
          draftTitle: state.createChildDraftTitle,
        },
        i18n,
      )
    : ''
  const toolbarMarkup = `
    <div class="favorite-tree__toolbar">
      <button class="favorite-tree__text-btn has-tooltip" data-action="locate-current" aria-label="${escapeHtml(i18n.t('locateTitle'))}">
        ${renderIcon('locate', 'ft-icon ft-icon--sm')}
        ${escapeHtml(i18n.t('locateLabel'))}
        ${renderTooltip(i18n.t('locateTitle'))}
      </button>
      <button
        class="favorite-tree__text-btn has-tooltip"
        data-action="focus-current-path"
        aria-label="${escapeHtml(i18n.t('focusCurrentPathTitle'))}"
      >
        ${escapeHtml(i18n.t('focusCurrentPathLabel'))}
        ${renderTooltip(i18n.t('focusCurrentPathTitle'))}
      </button>
      <button
        class="favorite-tree__text-btn has-tooltip"
        data-action="collapse-other-branches"
        aria-label="${escapeHtml(i18n.t('collapseOtherBranchesTitle'))}"
      >
        ${escapeHtml(i18n.t('collapseOtherBranchesLabel'))}
        ${renderTooltip(i18n.t('collapseOtherBranchesTitle'))}
      </button>
      ${state.rootSortHasCustomOrder
        ? `
          <button
            class="favorite-tree__text-btn has-tooltip ${state.rootSortMode === 'custom' ? 'is-active' : ''}"
            data-action="toggle-sort-mode"
            data-parent-key="${escapeHtml(ROOT_SORT_KEY)}"
            aria-label="${escapeHtml(state.rootSortMode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom'))}"
          >
            ${escapeHtml(state.rootSortMode === 'custom' ? i18n.t('sortModeCustomLabel') : i18n.t('sortModeDefaultLabel'))}
            ${renderTooltip(state.rootSortMode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom'))}
          </button>
          <button
            class="favorite-tree__text-btn has-tooltip"
            data-action="clear-custom-sort"
            data-parent-key="${escapeHtml(ROOT_SORT_KEY)}"
            aria-label="${escapeHtml(i18n.t('clearCustomSort'))}"
          >
            ${escapeHtml(i18n.t('clearCustomSort'))}
            ${renderTooltip(i18n.t('clearCustomSort'))}
          </button>
        `
        : ''}
      <button class="favorite-tree__text-btn" data-action="reset-panel-size" title="${escapeHtml(i18n.t('resetPanelSizeTitle'))}">${escapeHtml(i18n.t('resetPanelSizeLabel'))}</button>
      <button class="favorite-tree__text-btn has-tooltip ${hasExpandedNodes ? 'is-active' : ''}" data-action="toggle-expand-all" aria-label="${escapeHtml(expandActionTitle)}">
        ${expandActionIcon}
        ${escapeHtml(expandActionLabel)}
        ${renderTooltip(expandActionTitle)}
      </button>
      <button
        class="favorite-tree__text-btn has-tooltip ${state.autoRefreshPaused ? 'is-active' : ''}"
        data-action="toggle-auto-refresh"
        aria-label="${escapeHtml(autoRefreshActionLabel)}"
        aria-pressed="${state.autoRefreshPaused ? 'true' : 'false'}"
      >${autoRefreshActionIcon} ${escapeHtml(i18n.t('autoRefreshLabel'))}${renderTooltip(autoRefreshActionLabel)}</button>
    </div>
  `
  const controlsMarkup = state.controlsCollapsed
    ? ''
    : `
      <div class="favorite-tree__controls">
        ${searchMarkup}
        ${createChildMarkup}
        ${breadcrumbMarkup}
        ${toolbarMarkup}
      </div>
    `
  const noticeMarkup = renderPanelNotice(state, i18n)
  const bodyMarkup = state.searching && isSearching
    ? renderStatusCard({
        title: i18n.t('searchIndexing'),
      })
    : state.searchError && isSearching
    ? renderStatusCard({
        tone: 'error',
        title: i18n.t('searchFailedTitle'),
        description: i18n.t('searchFailedBody', { message: state.searchError }),
        hint: i18n.t('searchFailedHint'),
        actions: [
          { action: 'refresh', label: i18n.t('manualRefresh') },
          { action: 'settings', label: i18n.t('openSettings') },
        ],
      })
    : state.refreshing && !state.rootFavorites.length
    ? renderStatusCard({
        title: i18n.t('loadingFavorites'),
      })
    : isSearching && !visibleRoots.length
    ? renderStatusCard({
        title: i18n.t('noMatchesTitle'),
        description: i18n.t('noMatches'),
        hint: i18n.t('noMatchesHint'),
      })
    : state.rootFavorites.length
    ? `${noticeMarkup}${rootMarkup}`
    : state.lastRefreshError
    ? renderStatusCard({
        tone: 'error',
        title: i18n.t('refreshFailedTitle'),
        description: i18n.t('refreshFailed', { message: state.lastRefreshError }),
        hint: i18n.t('refreshFailedHint'),
        actions: [
          { action: 'refresh', label: i18n.t('manualRefresh') },
          { action: 'settings', label: i18n.t('openSettings') },
        ],
      })
    : renderStatusCard({
        tone: 'warning',
        title: i18n.t('noFavoritesTitle'),
        description: i18n.t('noFavorites'),
        hint: i18n.t('noFavoritesHint'),
        actions: [{ action: 'refresh', label: i18n.t('manualRefresh') }],
      })

  return `
    <div class="favorite-tree ${state.refreshing ? 'is-refreshing' : ''}">
      <div class="favorite-tree__header" data-drag-handle="panel" title="${escapeHtml(i18n.t('panelHeaderTitle'))}">
        <div class="favorite-tree__header-main">
          <div class="favorite-tree__title-row">
            <h1 class="favorite-tree__title">${escapeHtml(i18n.t('panelTitle'))}</h1>
            <span class="favorite-tree__title-count">${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}</span>
            <span class="favorite-tree__info" data-no-drag="true" tabindex="0" role="button" aria-label="${escapeHtml(i18n.t('panelInfoAria'))}">
              <span class="favorite-tree__info-icon">${renderIcon('info', 'ft-icon ft-icon--sm')}</span>
              ${renderTooltip(infoTooltip)}
            </span>
          </div>
        </div>
        <div class="favorite-tree__actions">
          ${state.canSwitchDisplayMode
            ? `<button class="favorite-tree__icon-btn has-tooltip" data-action="switch-display-mode" aria-label="${escapeHtml(i18n.t('switchToSidebar'))}">${renderIcon('sidebar')}${renderTooltip(i18n.t('switchToSidebar'))}</button>`
            : ''}
          <button
            class="favorite-tree__icon-btn has-tooltip ${state.controlsCollapsed ? 'is-active' : ''}"
            data-action="toggle-controls"
            aria-label="${controlsToggleTitle}"
            aria-expanded="${state.controlsCollapsed ? 'false' : 'true'}"
          >${controlsToggleLabel}${renderTooltip(controlsToggleTitle)}</button>
          <button class="favorite-tree__icon-btn has-tooltip" data-action="refresh" aria-label="${escapeHtml(i18n.t('manualRefresh'))}">${renderIcon('refresh')}${renderTooltip(i18n.t('manualRefresh'))}</button>
          <button class="favorite-tree__icon-btn has-tooltip" data-action="collapse-to-bubble" aria-label="${escapeHtml(i18n.t('collapseToBubble'))}">${renderIcon('panel-to-bubble')}${renderTooltip(i18n.t('collapseToBubble'))}</button>
          <button class="favorite-tree__icon-btn has-tooltip" data-action="settings" aria-label="${escapeHtml(i18n.t('openSettings'))}">${renderIcon('sliders')}${renderTooltip(i18n.t('openSettings'))}</button>
          <button class="favorite-tree__icon-btn has-tooltip" data-action="close" aria-label="${escapeHtml(i18n.t('hidePlugin'))}">${renderIcon('close')}${renderTooltip(i18n.t('hidePlugin'))}</button>
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
  if (!key) {
    return ''
  }
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const isLocated = key === state.lastLocatedNodeKey
  const isFlashing = key === state.flashLocatedNodeKey
  const isActiveSearchMatch = key === state.currentSearchMatchKey
  const isExpanded = state.expandedKeys.has(key)
  const loadState = state.loadStates.get(key) ?? 'idle'
  const children = accessors.getChildrenFor(title)
  const isSearching = normalizedQuery.length > 0
  const visibleChildren = isSearching
    ? children.filter((childTitle) => isNodeVisible(childTitle, normalizedQuery, accessors, [...ancestors, key]))
    : children
  const hasKnownChildren = visibleChildren.length > 0
  const isSearchCollapsed = state.searchCollapsedKeys.has(key)
  const effectiveExpanded = isSearching ? hasKnownChildren && !isSearchCollapsed : isExpanded
  const statusHint = renderNodeHint(key, depth, effectiveExpanded, loadState, state, i18n)
  const sortParentKey = parentKey ?? ROOT_SORT_KEY
  const sortItemId = buildSortItemId(sortParentKey, key)
  const childSortControls = renderSortModeControlsForParent(state, key, i18n)
  const isSelfSearchMatch = isSearching && key.includes(normalizedQuery)
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
      >${renderIcon('grip', 'ft-icon ft-icon--xs')}</button>
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

  const chevron = effectiveExpanded ? renderIcon('chevron-down', 'ft-icon ft-icon--xs') : renderIcon('chevron-right', 'ft-icon ft-icon--xs')
  const toggleMarkup = hasKnownChildren
    ? `<button class="tree-node__toggle" data-action="toggle-node" data-key="${escapeHtml(key)}" title="${escapeHtml(i18n.t('toggleNode'))}">${chevron}</button>`
    : '<span class="tree-node__toggle is-passive"></span>'

  return `
    <div class="tree-node" data-node-key="${escapeHtml(key)}">
      <div
        class="tree-node__row ${isCurrent ? 'is-current' : ''} ${isLocated ? 'is-located' : ''} ${isFlashing ? 'is-flashing' : ''} ${isActiveSearchMatch ? 'is-search-match-current' : ''}"
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
        <button
          class="tree-node__inline-action has-tooltip"
          data-action="create-child-page"
          data-page="${escapeHtml(title)}"
          data-no-drag="true"
          aria-label="${escapeHtml(i18n.t('createChildPageForParent', { title }))}"
        >
          ${renderIcon('child-plus', 'ft-icon ft-icon--xs')}
          ${renderTooltip(i18n.t('createChildPageForParent', { title }))}
        </button>
        <button
          class="tree-node__inline-action has-tooltip"
          data-action="open-page-in-sidebar"
          data-page="${escapeHtml(title)}"
          data-no-drag="true"
          aria-label="${escapeHtml(i18n.t('openInRightSidebar', { title }))}"
        >
          ${renderIcon('right-sidebar', 'ft-icon ft-icon--xs')}
          ${renderTooltip(i18n.t('openInRightSidebar', { title }))}
        </button>
        ${childSortControls}
        <span class="tree-node__meta">${isCurrent ? `<span class="tree-node__badge">${escapeHtml(i18n.t('badgeCurrent'))}</span>` : ''}${isLocated ? `<span class="tree-node__badge">${escapeHtml(i18n.t('badgeLocated'))}</span>` : ''}${isSelfSearchMatch ? `<span class="tree-node__badge ${isActiveSearchMatch ? 'tree-node__badge--active-match' : ''}">${escapeHtml(i18n.t('badgeMatch'))}</span>` : ''}</span>
      </div>
      ${statusHint}
      ${childrenMarkup}
    </div>
  `
}

function renderSortModeControlsForParent(state: TreeStateSnapshot, parentKey: string, i18n: FavoriteTreeI18n): string {
  const customOrder = state.sortOrders[parentKey]
  if (!customOrder?.length) {
    return ''
  }

  const mode: SortMode = state.sortModes[parentKey] === 'default' ? 'default' : 'custom'
  return renderSortModeControls(parentKey, mode, i18n)
}

function renderSortModeControls(parentKey: string, mode: SortMode, i18n: FavoriteTreeI18n): string {
  const switchTitle = mode === 'custom' ? i18n.t('sortSwitchToDefault') : i18n.t('sortSwitchToCustom')
  const badgeLabel = mode === 'custom' ? i18n.t('sortStateCustomActive') : i18n.t('sortStateCustomSaved')
  return `
    <span class="tree-node__sort-mode">
      <span class="tree-node__badge tree-node__badge--sort">${escapeHtml(badgeLabel)}</span>
      <button
        class="tree-node__sort-action ${mode === 'custom' ? 'is-active' : ''}"
        data-action="toggle-sort-mode"
        data-parent-key="${escapeHtml(parentKey)}"
        title="${escapeHtml(switchTitle)}"
      >${escapeHtml(mode === 'custom' ? i18n.t('sortModeCustomLabel') : i18n.t('sortModeDefaultLabel'))}</button>
      <button
        class="tree-node__sort-action"
        data-action="clear-custom-sort"
        data-parent-key="${escapeHtml(parentKey)}"
        title="${escapeHtml(i18n.t('clearCustomSort'))}"
      >${escapeHtml(i18n.t('clearCustomSort'))}</button>
    </span>
  `
}

function renderPanelNotice(state: TreeStateSnapshot, i18n: FavoriteTreeI18n): string {
  if (state.searchQuery || state.refreshing || !state.rootFavorites.length) {
    return ''
  }

  if (state.lastRefreshError) {
    return renderStatusCard({
      tone: 'error',
      title: i18n.t('refreshFailedTitle'),
      description: i18n.t('refreshFailed', { message: state.lastRefreshError }),
      hint: i18n.t('refreshFailedHint'),
      actions: [
        { action: 'refresh', label: i18n.t('manualRefresh') },
        { action: 'settings', label: i18n.t('openSettings') },
      ],
    })
  }

  if (!state.hasHierarchyRelations) {
    return renderStatusCard({
      tone: 'warning',
      title: i18n.t('noHierarchyTitle'),
      description: i18n.t('noHierarchyBody', { property: state.hierarchyProperty }),
      hint: i18n.t('noHierarchyHint'),
      actions: [
        { action: 'settings', label: i18n.t('openSettings') },
        { action: 'refresh', label: i18n.t('manualRefresh') },
      ],
    })
  }

  return ''
}

function renderStatusCard(options: {
  title: string
  description?: string
  hint?: string
  tone?: StatusTone
  actions?: StatusAction[]
}): string {
  const toneClass = options.tone && options.tone !== 'info' ? ` favorite-tree__status--${options.tone}` : ''
  const descriptionMarkup = options.description ? `<div class="favorite-tree__status-body">${escapeHtml(options.description)}</div>` : ''
  const hintMarkup = options.hint ? `<div class="favorite-tree__status-hint">${escapeHtml(options.hint)}</div>` : ''
  const actionsMarkup = options.actions?.length
    ? `<div class="favorite-tree__status-actions">${options.actions
        .map(
          (action) =>
            `<button class="favorite-tree__text-btn" data-action="${action.action}">${escapeHtml(action.label)}</button>`,
        )
        .join('')}</div>`
    : ''

  return `
    <div class="favorite-tree__status${toneClass}">
      <div class="favorite-tree__status-title">${escapeHtml(options.title)}</div>
      ${descriptionMarkup}
      ${hintMarkup}
      ${actionsMarkup}
    </div>
  `
}

function renderCycleNode(title: string, depth: number, i18n: FavoriteTreeI18n): string {
  return `
    <div class="tree-node" data-node-key="${escapeHtml(normalizeTitle(title))}">
      <div class="tree-node__row is-cycle" style="--depth:${depth}">
        <span class="tree-node__toggle is-passive"></span>
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

function renderHighlightedTitle(title: string | null | undefined, normalizedQuery: string): string {
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
  return `${escapeHtml(title.slice(0, start))}<mark class="tree-node__highlight">${escapeHtml(title.slice(start, end))}</mark>${escapeHtml(title.slice(end))}`
}

function buildSortItemId(parentKey: string, itemKey: string): string {
  return `${parentKey}::${itemKey}`
}
