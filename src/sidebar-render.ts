import type { FavoriteTreeI18n } from './i18n'
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
  const content = state.rootFavorites.length > 0
    ? state.rootFavorites
      .map((title, index) => renderSidebarNode(title, 0, [], index === state.rootFavorites.length - 1, state, accessors, i18n))
      .join('')
    : `<div class="favorite-sidebar-tree__empty">${escapeHtml(state.refreshing ? i18n.t('loadingFavorites') : i18n.t('noFavorites'))}</div>`

  return `
    <section class="favorite-sidebar-tree" data-favorite-sidebar-tree="true">
      <div class="favorite-sidebar-tree__header">
        <div class="favorite-sidebar-tree__header-main">
          <span class="favorite-sidebar-tree__heading">${escapeHtml(i18n.t('panelTitle'))}</span>
          <span class="favorite-sidebar-tree__count">${escapeHtml(i18n.t('rootCount', { count: state.rootFavorites.length }))}</span>
        </div>
        <button
          class="favorite-sidebar-tree__switch"
          data-on-click="sidebarTreeShowFloating"
          title="${escapeHtml(i18n.t('switchToFloating'))}"
          aria-label="${escapeHtml(i18n.t('switchToFloating'))}"
        >${escapeHtml(i18n.t('switchToFloating'))}</button>
      </div>
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
  align-items: center;
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

.favorite-sidebar-tree__switch {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ls-link-text-color, #2563eb);
  font-size: 12px;
  cursor: pointer;
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
): string {
  const key = normalizeTitle(title)
  const isCurrent = key === normalizeTitle(state.currentPageName)
  const children = accessors.getChildrenFor(title)
  const hasChildren = children.length > 0
  const isExpanded = state.expandedKeys.has(key)

  const toggleMarkup = hasChildren
    ? `
      <button
        class="favorite-sidebar-tree__toggle ${isExpanded ? 'is-expanded' : ''}"
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
  if (hasChildren && isExpanded) {
    const nextAncestors = [...ancestors, key]
    childrenMarkup = `
      <div class="favorite-sidebar-tree__children">
        ${children.map((childTitle, index) => {
          const childKey = normalizeTitle(childTitle)
          if (nextAncestors.includes(childKey)) {
            return renderSidebarLeaf(childTitle, true, i18n)
          }

          return renderSidebarNode(
            childTitle,
            depth + 1,
            nextAncestors,
            index === children.length - 1,
            state,
            accessors,
            i18n,
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
          <span class="favorite-sidebar-tree__title-text">${escapeHtml(title)}</span>
          ${isCurrent ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeCurrent'))}</span>` : ''}
        </button>
      </div>
      ${childrenMarkup}
    </div>
  `
}

function renderSidebarLeaf(title: string, isCycle: boolean, i18n: FavoriteTreeI18n): string {
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
          <span class="favorite-sidebar-tree__title-text">${escapeHtml(title)}</span>
          ${isCycle ? `<span class="favorite-sidebar-tree__badge">${escapeHtml(i18n.t('badgeCycle'))}</span>` : ''}
        </button>
      </div>
    </div>
  `
}
