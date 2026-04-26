import type { LoadState, TreeStateSnapshot } from './types'
import { escapeHtml, normalizeTitle } from './utils'

type TreeRenderAccessors = {
  getChildrenFor: (title: string) => string[]
}

export function renderFavoriteTree(state: TreeStateSnapshot, accessors: TreeRenderAccessors): string {
  if (state.viewMode === 'bubble') {
    const countLabel = state.rootFavorites.length > 99 ? '99+' : String(state.rootFavorites.length)
    return `
      <button
        class="favorite-tree-bubble ${state.refreshing ? 'is-refreshing' : ''}"
        data-action="expand-panel"
        data-drag-handle="bubble"
        title="点击展开收藏夹树，拖拽可移动位置"
        aria-label="展开收藏夹树"
      >
        <span class="favorite-tree-bubble__icon">★</span>
        <span class="favorite-tree-bubble__count">${escapeHtml(countLabel)}</span>
      </button>
    `
  }

  const autoRefreshActionLabel = state.autoRefreshPaused ? '恢复自动刷新' : '暂停自动刷新'
  const autoRefreshActionIcon = state.autoRefreshPaused ? '▶' : '⏸'
  const autoRefreshState = state.autoRefreshPaused ? '自动刷新已暂停' : `自动刷新 ${state.pollIntervalSeconds}s`
  const hasExpandedNodes = state.expandedKeys.size > 0
  const expandActionLabel = hasExpandedNodes ? '折叠' : '展开'
  const expandActionTitle = hasExpandedNodes ? '折叠所有已展开目录' : '展开所有已匹配目录'

  const rootMarkup = state.rootFavorites.length
    ? state.rootFavorites.map((title) => renderNode(title, 0, [], state, accessors)).join('')
    : '<div class="favorite-tree__status">当前没有收藏页面。先把页面加入 Logseq 收藏夹，插件才会把它们作为树根显示。</div>'

  const bodyMarkup = state.refreshing && !state.rootFavorites.length
    ? '<div class="favorite-tree__status">正在加载收藏树...</div>'
    : rootMarkup

  return `
    <div class="favorite-tree">
      <div class="favorite-tree__header" data-drag-handle="panel">
        <div class="favorite-tree__header-main">
          <h1 class="favorite-tree__title">收藏夹树</h1>
          <p class="favorite-tree__subtitle">拖动标题栏移动 · 属性 <code>${escapeHtml(state.hierarchyProperty)}</code></p>
        </div>
        <div class="favorite-tree__actions">
          <button class="favorite-tree__icon-btn" data-action="refresh" title="手动刷新">↻</button>
          <button class="favorite-tree__icon-btn" data-action="collapse-to-bubble" title="收回为悬浮球">○</button>
          <button class="favorite-tree__icon-btn" data-action="settings" title="打开设置">⚙</button>
          <button class="favorite-tree__icon-btn" data-action="close" title="隐藏插件">×</button>
        </div>
      </div>
      <div class="favorite-tree__toolbar">
        <button class="favorite-tree__text-btn" data-action="locate-current" title="快速定位当前页">定位</button>
        <button class="favorite-tree__text-btn ${hasExpandedNodes ? 'is-active' : ''}" data-action="toggle-expand-all" title="${expandActionTitle}">${expandActionLabel}</button>
        <button
          class="favorite-tree__text-btn ${state.autoRefreshPaused ? 'is-active' : ''}"
          data-action="toggle-auto-refresh"
          title="${autoRefreshActionLabel}"
          aria-pressed="${state.autoRefreshPaused ? 'true' : 'false'}"
        >${autoRefreshActionIcon} 自动刷新</button>
      </div>
      <div class="favorite-tree__body">${bodyMarkup}</div>
      <div class="favorite-tree__footer">
        <span>${escapeHtml(state.lastRefreshLabel)}</span>
        <span>${state.refreshing ? '刷新中...' : `${autoRefreshState} · ${state.rootFavorites.length} 个根节点`}</span>
      </div>
    </div>
  `
}

function renderNode(
  title: string,
  depth: number,
  ancestors: string[],
  state: TreeStateSnapshot,
  accessors: TreeRenderAccessors,
): string {
  const key = normalizeTitle(title)
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const isLocated = key === state.lastLocatedNodeKey
  const isFlashing = key === state.flashLocatedNodeKey
  const isExpanded = state.expandedKeys.has(key)
  const loadState = state.loadStates.get(key) ?? 'idle'
  const children = accessors.getChildrenFor(title)
  const hasKnownChildren = children.length > 0
  const statusHint = renderNodeHint(key, depth, isExpanded, loadState, hasKnownChildren, state)

  let childrenMarkup = ''
  if (isExpanded && loadState !== 'loading' && loadState !== 'error' && hasKnownChildren) {
    const nextAncestors = [...ancestors, key]
    childrenMarkup = `<div class="tree-node__children">${children
      .map((childTitle) => {
        const childKey = normalizeTitle(childTitle)
        if (nextAncestors.includes(childKey)) {
          return renderCycleNode(childTitle, depth + 1)
        }
        return renderNode(childTitle, depth + 1, nextAncestors, state, accessors)
      })
      .join('')}</div>`
  }

  const chevron = isExpanded ? '▾' : '▸'

  return `
    <div class="tree-node" data-node-key="${escapeHtml(key)}">
      <div class="tree-node__row ${isCurrent ? 'is-current' : ''} ${isLocated ? 'is-located' : ''} ${isFlashing ? 'is-flashing' : ''}" style="--depth:${depth}">
        <button class="tree-node__toggle" data-action="toggle-node" data-key="${escapeHtml(key)}" title="展开或折叠">${chevron}</button>
        <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="打开页面 ${escapeHtml(title)}">
          <span class="tree-node__title-text">${escapeHtml(title)}</span>
        </button>
        <span class="tree-node__meta">${isCurrent ? '<span class="tree-node__badge">当前页</span>' : ''}${isLocated ? '<span class="tree-node__badge">定位</span>' : ''}</span>
      </div>
      ${statusHint}
      ${childrenMarkup}
    </div>
  `
}

function renderCycleNode(title: string, depth: number): string {
  return `
    <div class="tree-node" data-node-key="${escapeHtml(normalizeTitle(title))}">
      <div class="tree-node__row is-cycle" style="--depth:${depth}">
        <span class="tree-node__toggle">•</span>
        <button class="tree-node__title" data-action="open-page" data-page="${escapeHtml(title)}" title="打开页面 ${escapeHtml(title)}">
          <span class="tree-node__title-text">${escapeHtml(title)}</span>
        </button>
        <span class="tree-node__meta"><span class="tree-node__badge">循环</span></span>
      </div>
      <div class="tree-node__hint" style="--depth:${depth}">检测到循环引用，已停止继续向下递归。</div>
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
): string {
  if (!isExpanded) {
    return ''
  }

  if (loadState === 'loading') {
    return `<div class="tree-node__hint" style="--depth:${depth}">首次展开时正在按属性关系加载子节点...</div>`
  }

  if (loadState === 'error') {
    const message = state.loadErrors.get(key) ?? '子节点加载失败'
    return `<div class="tree-node__hint" style="--depth:${depth}">${escapeHtml(message)}</div>`
  }

  if (state.loadedKeys.has(key) && !hasKnownChildren) {
    return `<div class="tree-node__hint" style="--depth:${depth}">未发现直接子页面。</div>`
  }

  return ''
}
