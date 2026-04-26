import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'

export const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: 'hierarchyProperty',
    type: 'string',
    default: 'parent',
    title: '层级属性名',
    description: '用于声明父页面的属性名，默认值为 parent。属性值支持单值或多值节点。',
  },
  {
    key: 'panelWidth',
    type: 'number',
    default: 320,
    title: '面板宽度',
    description: '收藏树展开为悬浮面板时的宽度，单位为像素。',
  },
  {
    key: 'pollIntervalSeconds',
    type: 'number',
    default: 5,
    title: '自动刷新间隔（秒）',
    description: '轮询自动刷新的时间间隔，单位为秒。',
  },
  {
    key: 'sidebarPosition',
    type: 'enum',
    default: 'left',
    title: '初始侧向偏好',
    description: '首次显示时默认靠左或靠右；拖动后会优先记住当前位置。',
    enumChoices: ['left', 'right'],
  },
]

export const INTERNAL_SETTINGS = {
  panelVisible: '__panelVisible',
  expandedKeys: '__expandedKeys',
  autoRefreshPaused: '__autoRefreshPaused',
  bodyScrollTop: '__bodyScrollTop',
  lastLocatedNodeKey: '__lastLocatedNodeKey',
  viewMode: '__viewMode',
  panelX: '__panelX',
  panelY: '__panelY',
  bubbleX: '__bubbleX',
  bubbleY: '__bubbleY',
  graphStates: '__graphStates',
} as const

export const DEFAULT_POLL_INTERVAL_SECONDS = 5
export const REFRESH_DEBOUNCE_MS = 250
export const MAIN_UI_MARGIN = 12
export const PANEL_TOP_OFFSET = 56
export const PANEL_MIN_WIDTH = 280
export const PANEL_MAX_WIDTH = 720
export const PANEL_MIN_HEIGHT = 360
export const PANEL_MAX_HEIGHT = 720
export const BUBBLE_SIZE = 56
export const DRAG_THRESHOLD_PX = 4
