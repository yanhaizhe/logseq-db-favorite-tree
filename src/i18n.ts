export type AppLanguage = 'en' | 'zh-CN'

type TranslationParams = Record<string, number | string>
type TranslationValue = string | ((params: TranslationParams) => string)

type Messages = {
  toolbarTitle: TranslationValue
  settingsHierarchyTitle: TranslationValue
  settingsHierarchyDescription: TranslationValue
  settingsPanelWidthTitle: TranslationValue
  settingsPanelWidthDescription: TranslationValue
  settingsPollIntervalTitle: TranslationValue
  settingsPollIntervalDescription: TranslationValue
  settingsSidebarPositionTitle: TranslationValue
  settingsSidebarPositionDescription: TranslationValue
  mountPointMissing: TranslationValue
  startupFailed: TranslationValue
  bubbleExpandTitle: TranslationValue
  bubbleExpandAria: TranslationValue
  resumeAutoRefresh: TranslationValue
  pauseAutoRefresh: TranslationValue
  autoRefreshPaused: TranslationValue
  autoRefreshEverySeconds: TranslationValue
  collapseLabel: TranslationValue
  expandLabel: TranslationValue
  collapseAllTitle: TranslationValue
  expandAllTitle: TranslationValue
  expandControlsTitle: TranslationValue
  collapseControlsTitle: TranslationValue
  infoTooltip: TranslationValue
  searchPlaceholder: TranslationValue
  locateLabel: TranslationValue
  locateTitle: TranslationValue
  resetPanelSizeLabel: TranslationValue
  resetPanelSizeTitle: TranslationValue
  autoRefreshLabel: TranslationValue
  searchIndexing: TranslationValue
  loadingFavorites: TranslationValue
  noMatches: TranslationValue
  noFavorites: TranslationValue
  panelHeaderTitle: TranslationValue
  panelTitle: TranslationValue
  panelInfoAria: TranslationValue
  manualRefresh: TranslationValue
  collapseToBubble: TranslationValue
  openSettings: TranslationValue
  hidePlugin: TranslationValue
  refreshing: TranslationValue
  rootCount: TranslationValue
  resizePanel: TranslationValue
  dragSort: TranslationValue
  toggleNode: TranslationValue
  openPage: TranslationValue
  badgeCurrent: TranslationValue
  badgeLocated: TranslationValue
  badgeMatch: TranslationValue
  badgeCycle: TranslationValue
  cycleHint: TranslationValue
  loadingChildren: TranslationValue
  loadChildrenFailed: TranslationValue
  noDirectChildren: TranslationValue
  currentPageNotInTree: TranslationValue
  notRefreshedYet: TranslationValue
  locateNoCurrentPage: TranslationValue
  locatePageNotInTree: TranslationValue
  refreshFailed: TranslationValue
  refreshToastFailed: TranslationValue
  refreshReasonStartup: TranslationValue
  refreshReasonPanelOpen: TranslationValue
  refreshReasonBubbleOpen: TranslationValue
  refreshReasonBubbleExpand: TranslationValue
  refreshReasonManual: TranslationValue
  refreshReasonPoll: TranslationValue
  refreshReasonDbChanged: TranslationValue
  refreshReasonGraphChanged: TranslationValue
  refreshReasonSettingsProperty: TranslationValue
  refreshReasonDefault: TranslationValue
}

export type MessageKey = keyof Messages

export type FavoriteTreeI18n = {
  language: AppLanguage
  t: (key: MessageKey, params?: TranslationParams) => string
  formatClock: (date: Date) => string
}

const messages: Record<AppLanguage, Messages> = {
  en: {
    toolbarTitle: 'DB Favorite Tree',
    settingsHierarchyTitle: 'Hierarchy Property',
    settingsHierarchyDescription:
      'Property name used to declare the parent page. The default is parent. Both single and multi-value references are supported.',
    settingsPanelWidthTitle: 'Panel Width',
    settingsPanelWidthDescription: 'Default width of the floating panel in pixels.',
    settingsPollIntervalTitle: 'Auto Refresh Interval (Seconds)',
    settingsPollIntervalDescription: 'Polling interval for automatic refresh, in seconds.',
    settingsSidebarPositionTitle: 'Initial Side Preference',
    settingsSidebarPositionDescription:
      'Choose whether the panel prefers the left or right side on first display. Remembered drag positions take priority afterward.',
    mountPointMissing: 'Plugin mount point is missing.',
    startupFailed: ({ message }) => `DB Favorite Tree failed to start: ${message}`,
    bubbleExpandTitle: 'Click to open the favorite tree, drag to move',
    bubbleExpandAria: 'Open favorite tree',
    resumeAutoRefresh: 'Resume auto refresh',
    pauseAutoRefresh: 'Pause auto refresh',
    autoRefreshPaused: 'Auto refresh paused',
    autoRefreshEverySeconds: ({ seconds }) => `Auto refresh ${seconds}s`,
    collapseLabel: 'Collapse',
    expandLabel: 'Expand',
    collapseAllTitle: 'Collapse all expanded branches',
    expandAllTitle: 'Expand all matched branches',
    expandControlsTitle: 'Expand controls',
    collapseControlsTitle: 'Collapse controls',
    infoTooltip: ({ property }) =>
      `Drag the header to move, double-click to collapse into a bubble; hierarchy property: ${property}`,
    searchPlaceholder: 'Search page titles',
    locateLabel: 'Locate',
    locateTitle: 'Locate the current page',
    resetPanelSizeLabel: 'Default size',
    resetPanelSizeTitle: 'Restore the default panel size',
    autoRefreshLabel: 'Auto refresh',
    searchIndexing: 'Building search index...',
    loadingFavorites: 'Loading favorite tree...',
    noMatches: 'No matching pages. Try a shorter keyword.',
    noFavorites:
      'There are no favorite pages yet. Add pages to Logseq favorites first so the plugin can use them as tree roots.',
    panelHeaderTitle: 'Drag to move, double-click to collapse into a bubble',
    panelTitle: 'Favorite Tree',
    panelInfoAria: 'Show info',
    manualRefresh: 'Refresh now',
    collapseToBubble: 'Collapse to bubble',
    openSettings: 'Open settings',
    hidePlugin: 'Hide plugin',
    refreshing: 'Refreshing...',
    rootCount: ({ count }) => `${count} root${Number(count) === 1 ? '' : 's'}`,
    resizePanel: 'Drag to resize the panel',
    dragSort: 'Drag to customize order',
    toggleNode: 'Expand or collapse',
    openPage: ({ title }) => `Open page ${title}`,
    badgeCurrent: 'Current',
    badgeLocated: 'Located',
    badgeMatch: 'Match',
    badgeCycle: 'Cycle',
    cycleHint: 'Cycle detected. Recursion stops here.',
    loadingChildren: 'Loading child pages from property relations on first expansion...',
    loadChildrenFailed: 'Failed to load child pages',
    noDirectChildren: 'No direct child pages found.',
    currentPageNotInTree: 'The current page is not in the favorite tree',
    notRefreshedYet: 'Not refreshed yet',
    locateNoCurrentPage: 'There is no current page to locate.',
    locatePageNotInTree: 'The current page is not in the favorite tree.',
    refreshFailed: ({ message }) => `Refresh failed: ${message}`,
    refreshToastFailed: ({ message }) => `DB Favorite Tree refresh failed: ${message}`,
    refreshReasonStartup: 'Startup',
    refreshReasonPanelOpen: 'Panel opened',
    refreshReasonBubbleOpen: 'Bubble shown',
    refreshReasonBubbleExpand: 'Expanded from bubble',
    refreshReasonManual: 'Manual refresh',
    refreshReasonPoll: 'Polling refresh',
    refreshReasonDbChanged: 'Database changed',
    refreshReasonGraphChanged: 'Graph switched',
    refreshReasonSettingsProperty: 'Settings changed',
    refreshReasonDefault: 'Refresh',
  },
  'zh-CN': {
    toolbarTitle: 'DB 收藏树',
    settingsHierarchyTitle: '层级属性名',
    settingsHierarchyDescription: '用于声明父页面的属性名，默认值为 parent。属性值支持单值或多值节点。',
    settingsPanelWidthTitle: '面板宽度',
    settingsPanelWidthDescription: '收藏树展开为悬浮面板时的宽度，单位为像素。',
    settingsPollIntervalTitle: '自动刷新间隔（秒）',
    settingsPollIntervalDescription: '轮询自动刷新的时间间隔，单位为秒。',
    settingsSidebarPositionTitle: '初始侧向偏好',
    settingsSidebarPositionDescription: '首次显示时默认靠左或靠右；拖动后会优先记住当前位置。',
    mountPointMissing: '插件挂载点不存在',
    startupFailed: ({ message }) => `DB Favorite Tree 启动失败: ${message}`,
    bubbleExpandTitle: '点击展开收藏夹树，拖拽可移动位置',
    bubbleExpandAria: '展开收藏夹树',
    resumeAutoRefresh: '恢复自动刷新',
    pauseAutoRefresh: '暂停自动刷新',
    autoRefreshPaused: '自动刷新已暂停',
    autoRefreshEverySeconds: ({ seconds }) => `自动刷新 ${seconds}s`,
    collapseLabel: '折叠',
    expandLabel: '展开',
    collapseAllTitle: '折叠所有已展开目录',
    expandAllTitle: '展开所有已匹配目录',
    expandControlsTitle: '展开功能区',
    collapseControlsTitle: '收起功能区',
    infoTooltip: ({ property }) => `拖动标题栏移动，双击收回为悬浮球；当前层级属性：${property}`,
    searchPlaceholder: '搜索页面标题',
    locateLabel: '定位',
    locateTitle: '快速定位当前页',
    resetPanelSizeLabel: '默认尺寸',
    resetPanelSizeTitle: '恢复面板默认宽高',
    autoRefreshLabel: '自动刷新',
    searchIndexing: '正在建立搜索索引...',
    loadingFavorites: '正在加载收藏树...',
    noMatches: '没有匹配的页面，试试更短的关键词。',
    noFavorites: '当前没有收藏页面。先把页面加入 Logseq 收藏夹，插件才会把它们作为树根显示。',
    panelHeaderTitle: '拖动可移动，双击可收回为悬浮球',
    panelTitle: '收藏夹树',
    panelInfoAria: '查看说明',
    manualRefresh: '手动刷新',
    collapseToBubble: '收回为悬浮球',
    openSettings: '打开设置',
    hidePlugin: '隐藏插件',
    refreshing: '刷新中...',
    rootCount: ({ count }) => `${count} 个根节点`,
    resizePanel: '拖动调整面板大小',
    dragSort: '拖动自定义排序',
    toggleNode: '展开或折叠',
    openPage: ({ title }) => `打开页面 ${title}`,
    badgeCurrent: '当前页',
    badgeLocated: '定位',
    badgeMatch: '匹配',
    badgeCycle: '循环',
    cycleHint: '检测到循环引用，已停止继续向下递归。',
    loadingChildren: '首次展开时正在按属性关系加载子节点...',
    loadChildrenFailed: '子节点加载失败',
    noDirectChildren: '未发现直接子页面。',
    currentPageNotInTree: '当前页不在收藏树中',
    notRefreshedYet: '尚未刷新',
    locateNoCurrentPage: '当前没有可定位的页面。',
    locatePageNotInTree: '当前页不在收藏树中。',
    refreshFailed: ({ message }) => `刷新失败: ${message}`,
    refreshToastFailed: ({ message }) => `DB Favorite Tree 刷新失败: ${message}`,
    refreshReasonStartup: '启动初始化',
    refreshReasonPanelOpen: '打开面板',
    refreshReasonBubbleOpen: '显示悬浮球',
    refreshReasonBubbleExpand: '悬浮球展开',
    refreshReasonManual: '手动刷新',
    refreshReasonPoll: '轮询刷新',
    refreshReasonDbChanged: '数据库变更',
    refreshReasonGraphChanged: '图谱切换',
    refreshReasonSettingsProperty: '设置变更',
    refreshReasonDefault: '刷新',
  },
}

export async function getFavoriteTreeI18n(): Promise<FavoriteTreeI18n> {
  const language = normalizeAppLanguage(await readPreferredLanguage())
  return createFavoriteTreeI18n(language)
}

export function createFavoriteTreeI18n(language: string | null | undefined): FavoriteTreeI18n {
  const normalized = normalizeAppLanguage(language)

  return {
    language: normalized,
    t: (key, params = {}) => resolveMessage(normalized, key, params),
    formatClock: (date) =>
      new Intl.DateTimeFormat(normalized === 'zh-CN' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date),
  }
}

export function normalizeAppLanguage(language: string | null | undefined): AppLanguage {
  const normalized = typeof language === 'string' ? language.trim().toLocaleLowerCase() : ''
  return normalized.startsWith('zh') ? 'zh-CN' : 'en'
}

async function readPreferredLanguage(): Promise<string | null> {
  try {
    const configs = await logseq.App.getUserConfigs()
    if (configs && typeof configs === 'object') {
      const record = configs as Record<string, unknown>
      for (const key of ['preferredLanguage', 'preferred-language', 'preferredLang', 'locale', 'lang']) {
        const value = record[key]
        if (typeof value === 'string' && value.trim()) {
          return value.trim()
        }
      }
    }
  } catch {
    // Ignore and fall back to navigator language.
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language.trim()) {
    return navigator.language.trim()
  }

  return null
}

function resolveMessage(language: AppLanguage, key: MessageKey, params: TranslationParams): string {
  const candidate = messages[language][key] ?? messages.en[key]
  return typeof candidate === 'function' ? candidate(params) : candidate
}
