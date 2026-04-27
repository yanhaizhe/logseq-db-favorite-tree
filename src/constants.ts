import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'
import type { FavoriteTreeI18n } from './i18n'

export function buildSettingsSchema(i18n: FavoriteTreeI18n): SettingSchemaDesc[] {
  return [
    {
      key: 'hierarchyProperty',
      type: 'string',
      default: 'parent',
      title: i18n.t('settingsHierarchyTitle'),
      description: i18n.t('settingsHierarchyDescription'),
    },
    {
      key: 'panelWidth',
      type: 'number',
      default: 320,
      title: i18n.t('settingsPanelWidthTitle'),
      description: i18n.t('settingsPanelWidthDescription'),
    },
    {
      key: 'pollIntervalSeconds',
      type: 'number',
      default: 60,
      title: i18n.t('settingsPollIntervalTitle'),
      description: i18n.t('settingsPollIntervalDescription'),
    },
    {
      key: 'sidebarPosition',
      type: 'enum',
      default: 'left',
      title: i18n.t('settingsSidebarPositionTitle'),
      description: i18n.t('settingsSidebarPositionDescription'),
      enumChoices: ['left', 'right'],
    },
    {
      key: 'displayModePreference',
      type: 'enum',
      default: 'sidebar',
      title: i18n.t('settingsDisplayModePreferenceTitle'),
      description: i18n.t('settingsDisplayModePreferenceDescription'),
      enumChoices: ['sidebar', 'floating', 'mixed'],
    },
  ]
}

export const INTERNAL_SETTINGS = {
  panelVisible: '__panelVisible',
  expandedKeys: '__expandedKeys',
  autoRefreshPaused: '__autoRefreshPaused',
  bodyScrollTop: '__bodyScrollTop',
  lastLocatedNodeKey: '__lastLocatedNodeKey',
  viewMode: '__viewMode',
  displayMode: '__displayMode',
  panelX: '__panelX',
  panelY: '__panelY',
  bubbleX: '__bubbleX',
  bubbleY: '__bubbleY',
  graphStates: '__graphStates',
} as const

export const DEFAULT_POLL_INTERVAL_SECONDS = 60
export const REFRESH_DEBOUNCE_MS = 250
export const MAIN_UI_MARGIN = 12
export const PANEL_TOP_OFFSET = 56
export const PANEL_MIN_WIDTH = 280
export const PANEL_MAX_WIDTH = 720
export const PANEL_MIN_HEIGHT = 360
export const PANEL_MAX_HEIGHT = 720
export const BUBBLE_SIZE = 56
export const DRAG_THRESHOLD_PX = 4
export const ROOT_SORT_KEY = '__root__'
