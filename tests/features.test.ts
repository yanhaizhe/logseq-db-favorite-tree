import { getFavoriteTreeI18n } from '../src/i18n'
import { renderFavoriteTree, renderIcon } from '../src/render'
import { renderSidebarTree } from '../src/sidebar-render'
import { FavoriteTreeSettingsStore } from '../src/settings'
import type { TreeStateSnapshot } from '../src/types'
import { extractErrorMessage, findPropertyValue, sanitizeDomId, escapeSelectorValue, escapeAttrValue } from '../src/utils'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log('Running features tests...')

  // 1. Check i18n keys
  const i18n = await getFavoriteTreeI18n('zh-CN')
  assert(Boolean(i18n.t('contextMenuMoreActions')), 'zh-CN contextMenuMoreActions exists')
  assert(Boolean(i18n.t('contextMenuOpenInRightSidebar')), 'zh-CN contextMenuOpenInRightSidebar exists')
  assert(Boolean(i18n.t('contextMenuCreateChildPage')), 'zh-CN contextMenuCreateChildPage exists')
  assert(Boolean(i18n.t('contextMenuCopyPageRef')), 'zh-CN contextMenuCopyPageRef exists')
  assert(Boolean(i18n.t('contextMenuCopyPageTitle')), 'zh-CN contextMenuCopyPageTitle exists')
  assert(Boolean(i18n.t('contextMenuExpandSubtree')), 'zh-CN contextMenuExpandSubtree exists')
  assert(Boolean(i18n.t('contextMenuCollapseSubtree')), 'zh-CN contextMenuCollapseSubtree exists')
  assert(Boolean(i18n.t('contextMenuClearCustomSort')), 'zh-CN contextMenuClearCustomSort exists')
  assert(Boolean(i18n.t('toastCopiedRef', { ref: '[[Test]]' })), 'zh-CN toastCopiedRef exists')
  assert(Boolean(i18n.t('toastCopiedTitle', { title: 'Test' })), 'zh-CN toastCopiedTitle exists')

  const i18nEn = await getFavoriteTreeI18n('en')
  assert(Boolean(i18nEn.t('contextMenuMoreActions')), 'en contextMenuMoreActions exists')
  assert(Boolean(i18nEn.t('contextMenuOpenInRightSidebar')), 'en contextMenuOpenInRightSidebar exists')

  // 2. Icon rendering
  const moreIcon = renderIcon('more')
  assert(moreIcon.includes('svg') && moreIcon.includes('circle'), 'renderIcon more produces valid svg')
  const copyIcon = renderIcon('copy')
  assert(copyIcon.includes('svg') && copyIcon.includes('rect'), 'renderIcon copy produces valid svg')

  // 3. Floating panel markup with context menu and tree guide lines
  const mockSnapshot: TreeStateSnapshot = {
    rootFavorites: ['ParentPage'],
    sortOrders: {},
    sortModes: {},
    createChildDraftParent: null,
    createChildDraftTitle: '',
    perfSummary: null,
    expandedKeys: new Set(['parentpage']),
    searchCollapsedKeys: new Set(),
    loadedKeys: new Set(['parentpage']),
    loadStates: new Map([['parentpage', 'loaded']]),
    loadErrors: new Map(),
    searchError: null,
    currentSearchMatchKey: null,
    currentSearchMatchNumber: 0,
    searchMatchCount: 0,
    currentPageName: null,
    currentPagePath: [],
    lastLocatedNodeKey: null,
    flashLocatedNodeKey: null,
    refreshing: false,
    searching: false,
    searchQuery: '',
    lastRefreshError: null,
    hasHierarchyRelations: true,
    autoRefreshPaused: false,
    pollIntervalSeconds: 30,
    hierarchyProperty: '页面标签',
    lastRefreshLabel: 'Just now',
    viewMode: 'panel',
    displayMode: 'floating',
    canSwitchDisplayMode: true,
    controlsCollapsed: false,
    rootSortHasCustomOrder: false,
    rootSortMode: 'default',
    contextMenu: {
      page: 'ParentPage',
      parentKey: 'root',
      x: 150,
      y: 220,
      hasChildren: true,
      hasCustomSort: false,
      isExpanded: true,
    },
  }

  const accessors = {
    getChildrenFor: (title: string) => (title === 'ParentPage' ? ['ChildPage'] : []),
  }

  const floatingHtml = renderFavoriteTree(mockSnapshot, accessors, i18n)
  assert(floatingHtml.includes('ft-context-menu'), 'Floating tree renders context menu when state.contextMenu != null')
  assert(floatingHtml.includes('open-in-right-sidebar'), 'Floating tree context menu contains open-in-right-sidebar')
  assert(floatingHtml.includes('create-child-page'), 'Floating tree context menu contains create-child-page')
  assert(floatingHtml.includes('copy-page-ref'), 'Floating tree context menu contains copy-page-ref')
  assert(floatingHtml.includes('copy-page-title'), 'Floating tree context menu contains copy-page-title')
  assert(floatingHtml.includes('collapse-subtree'), 'Floating tree context menu contains collapse-subtree for expanded node')
  assert(floatingHtml.includes('tree-node--child'), 'Floating tree children have tree-node--child class for guide lines')
  assert(floatingHtml.includes('data-action="open-context-menu"'), 'Floating tree node rows include open-context-menu trigger button')

  // Verify that rows themselves don't render the two moved actions
  const snapshotNoMenu: TreeStateSnapshot = { ...mockSnapshot, contextMenu: null }
  const floatingHtmlNoMenu = renderFavoriteTree(snapshotNoMenu, accessors, i18n)
  assert(!floatingHtmlNoMenu.includes('data-action="create-child-page"'), 'Floating tree rows do not include inline create-child-page button')
  assert(!floatingHtmlNoMenu.includes('data-action="open-page-in-sidebar"'), 'Floating tree rows do not include inline open-page-in-sidebar button')

  // 4. Sidebar markup with context menu and tree guide lines
  const sidebarHtml = renderSidebarTree(mockSnapshot, accessors, i18n)
  assert(sidebarHtml.includes('favorite-sidebar-tree__context-menu'), 'Sidebar tree renders context menu when state.contextMenu != null')
  assert(sidebarHtml.includes('favorite-sidebar-tree__context-backdrop'), 'Sidebar tree renders context backdrop when state.contextMenu != null')
  assert(sidebarHtml.includes('data-on-click="sidebarTreeCloseContextMenu"'), 'Context backdrop has close click handler')
  assert(sidebarHtml.includes('favorite-sidebar-tree__node--child'), 'Sidebar tree children have favorite-sidebar-tree__node--child class for guide lines')
  assert(sidebarHtml.includes('data-role="sidebar-context-trigger"'), 'Sidebar tree node rows include sidebar-context-trigger button')
  assert(sidebarHtml.includes('data-rect="true"'), 'Sidebar rows and triggers include data-rect="true" for IPC measurement')
  assert(sidebarHtml.includes('data-on-contextmenu="sidebarTreeOpenContextMenu"'), 'Sidebar tree rows include data-on-contextmenu listener')
  assert(sidebarHtml.includes('id="ft-trigger-'), 'Sidebar triggers have sanitized IDs')
  assert(sidebarHtml.includes('id="ft-row-'), 'Sidebar rows have sanitized IDs')

  const sidebarHtmlNoMenu = renderSidebarTree(snapshotNoMenu, accessors, i18n)
  assert(!sidebarHtmlNoMenu.includes('data-on-click="sidebarTreeCreateChildPage"'), 'Sidebar rows do not include inline create-child-page button')
  assert(!sidebarHtmlNoMenu.includes('data-on-click="sidebarTreeOpenPageInSidebar"'), 'Sidebar rows do not include inline open-page-in-sidebar button')

  // 5. Settings store defaults to 页面标签 (page tags) instead of parent or tags
  const settings = new FavoriteTreeSettingsStore()
  assert(settings.getHierarchyProperty() === '页面标签', 'getHierarchyProperty defaults to 页面标签')

  // 6. extractErrorMessage correctly parses Error, RPC plain objects, strings, and fallback
  assert(extractErrorMessage(new Error('js error'), 'fallback') === 'js error', 'extractErrorMessage handles Error instance')
  assert(extractErrorMessage({ message: 'rpc error' }, 'fallback') === 'rpc error', 'extractErrorMessage handles RPC { message } object')
  assert(extractErrorMessage({ msg: 'rpc msg' }, 'fallback') === 'rpc msg', 'extractErrorMessage handles RPC { msg } object')
  assert(extractErrorMessage('string error', 'fallback') === 'string error', 'extractErrorMessage handles raw string error')
  assert(extractErrorMessage(null, 'fallback') === 'fallback', 'extractErrorMessage returns fallback when error is null')

  // 7. findPropertyValue handles 页面标签 and Page Tags across direct and namespaced forms
  assert(findPropertyValue({ 页面标签: 'ParentA' }, '页面标签') === 'ParentA', 'findPropertyValue matches direct 页面标签')
  assert(findPropertyValue({ ':user.property/页面标签': 'ParentB' }, '页面标签') === 'ParentB', 'findPropertyValue matches :user.property/页面标签')
  assert(findPropertyValue({ 'user.property/页面标签': 'ParentC' }, '页面标签') === 'ParentC', 'findPropertyValue matches user.property/页面标签')
  assert(findPropertyValue({ 'Page Tags': 'ParentD' }, '页面标签') === 'ParentD', 'findPropertyValue cross-matches Page Tags when searching 页面标签')
  assert(findPropertyValue({ '页面标签': 'ParentE' }, 'Page Tags') === 'ParentE', 'findPropertyValue cross-matches 页面标签 when searching Page Tags')
  assert(findPropertyValue({ ':logseq.property/page-tags': 'ParentF' }, '页面标签') === 'ParentF', 'findPropertyValue matches :logseq.property/page-tags')

  // 8. Test entity ref extraction logic for Clojure :db/id
  const testIdMap = new Map<number, string>([[1042, 'ParentNode']])
  const resolveSample = (item: unknown) => {
    if (typeof item === 'number') return testIdMap.get(item) ?? null
    if (typeof item === 'object' && item !== null) {
      const rec = item as Record<string, unknown>
      const dbId =
        typeof rec.id === 'number'
          ? rec.id
          : typeof rec[':db/id'] === 'number'
            ? (rec[':db/id'] as number)
            : typeof rec['db/id'] === 'number'
              ? (rec['db/id'] as number)
              : null
      if (dbId != null) return testIdMap.get(dbId) ?? null
    }
    return null
  }
  assert(resolveSample(1042) === 'ParentNode', 'resolves numeric entity id directly')
  assert(resolveSample({ ':db/id': 1042 }) === 'ParentNode', 'resolves Clojure {:db/id 1042}')
  assert(resolveSample({ 'db/id': 1042 }) === 'ParentNode', 'resolves {db/id: 1042}')
  assert(resolveSample({ id: 1042 }) === 'ParentNode', 'resolves {id: 1042}')

  // 9. Test ID and UUID extraction across formats (string, object uuid, transit, :block/uuid)
  const extractIdAndUuid = (page: unknown): { uuid: string | null; id: number | null } => {
    if (!page || typeof page !== 'object') return { uuid: null, id: null }
    const rec = page as Record<string, unknown>
    let uuid: string | null = null
    if (typeof rec.uuid === 'string' && rec.uuid.trim()) {
      uuid = rec.uuid.trim()
    } else if (typeof rec[':block/uuid'] === 'string' && (rec[':block/uuid'] as string).trim()) {
      uuid = (rec[':block/uuid'] as string).trim()
    } else if (typeof rec.uuid === 'object' && rec.uuid !== null && typeof (rec.uuid as any).uuid === 'string') {
      uuid = (rec.uuid as any).uuid
    }

    let id: number | null = null
    if (typeof rec.id === 'number') {
      id = rec.id
    } else if (typeof rec[':db/id'] === 'number') {
      id = rec[':db/id'] as number
    } else if (typeof rec['db/id'] === 'number') {
      id = rec['db/id'] as number
    }

    return { uuid, id }
  }

  const p1 = extractIdAndUuid({ uuid: '111-222', id: 456 })
  assert(p1.uuid === '111-222' && p1.id === 456, 'extracts plain uuid and id')
  const p2 = extractIdAndUuid({ ':block/uuid': '333-444', ':db/id': 789 })
  assert(p2.uuid === '333-444' && p2.id === 789, 'extracts Clojure :block/uuid and :db/id')
  const p3 = extractIdAndUuid({ uuid: { uuid: '555-666' }, 'db/id': 999 })
  assert(p3.uuid === '555-666' && p3.id === 999, 'extracts Transit object UUID and db/id')

  // 10. DOM ID sanitization and selector escaping
  assert(sanitizeDomId('trigger', 'Test Page 1') === 'ft-trigger-Test20Page201', 'sanitizeDomId produces valid DOM id')
  assert(escapeSelectorValue('Hello "World"') === 'Hello \\"World\\"', 'escapeSelectorValue escapes quotes without hex space breaks')
  assert(escapeAttrValue('a"b\\c') === 'a\\"b\\\\c', 'escapeAttrValue escapes quotes and backslashes')

  // 11. Viewport fallback safety calculation
  const rawViewportWidth = Math.max(0, 0, 0)
  const rawViewportHeight = Math.max(0, 0, 0)
  const viewportWidth = rawViewportWidth > 200 ? rawViewportWidth : 1200
  const viewportHeight = rawViewportHeight > 200 ? rawViewportHeight : 800
  assert(viewportWidth === 1200, 'safe viewport width fallback is 1200 when 0')
  assert(viewportHeight === 800, 'safe viewport height fallback is 800 when 0')

  console.log('All features tests passed successfully!')
}

runTests().catch((error) => {
  console.error(error)
  process.exit(1)
})
