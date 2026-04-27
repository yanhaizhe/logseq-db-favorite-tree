import type { PageEntity } from '@logseq/libs/dist/LSPlugin'

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error'
export type ViewMode = 'panel' | 'bubble'
export type DisplayMode = 'floating' | 'sidebar'
export type DisplayModePreference = 'mixed' | 'sidebar' | 'floating'
export type DragKind = 'panel' | 'bubble' | 'panel-resize'
export type SidebarPosition = 'left' | 'right'
export type SortPlacement = 'before' | 'after'
export type RefreshReason =
  | 'startup'
  | 'panel-open'
  | 'bubble-open'
  | 'bubble-expand'
  | 'manual'
  | 'poll'
  | 'db-changed'
  | 'graph-changed'
  | 'settings-property'

export type SortOrderMap = Record<string, string[]>
export type SortMode = 'default' | 'custom'
export type SortModeMap = Record<string, SortMode>

export type SortableItem = {
  itemId: string
  parentKey: string
  title: string
}

export type SortDropTarget = SortableItem & {
  placement: SortPlacement
}

export type SortFeedbackKind = 'idle' | 'before' | 'after' | 'invalid-self' | 'invalid-level'

export type SortFeedbackState = {
  itemId: string
  parentKey: string
  targetItemId: string | null
  targetParentKey: string | null
  placement: SortPlacement | null
  kind: SortFeedbackKind
}

export type DragState = {
  kind: DragKind
  pointerId: number
  startScreenX: number
  startScreenY: number
  originX: number
  originY: number
  originWidth?: number
  originHeight?: number
  moved: boolean
  handleElement: HTMLElement | null
}

export type PluginSettings = {
  hierarchyProperty?: string
  panelWidth?: number
  pollIntervalSeconds?: number
  sidebarPosition?: string
  displayModePreference?: DisplayModePreference
  __panelVisible?: boolean
  __expandedKeys?: string[]
  __autoRefreshPaused?: boolean
  __bodyScrollTop?: number
  __lastLocatedNodeKey?: string
  __viewMode?: ViewMode
  __displayMode?: DisplayMode
  __panelX?: number
  __panelY?: number
  __bubbleX?: number
  __bubbleY?: number
  __graphStates?: string
} & Record<string, unknown>

export type FloatingPositions = {
  panelX: number
  panelY: number
  bubbleX: number
  bubbleY: number
}

export type PanelSize = {
  width: number
  height: number
}

export type FloatingFrame = {
  x: number
  y: number
  width: number
  height: number
}

export type PersistedPluginState = {
  expandedKeys: string[]
  bodyScrollTop: number
  lastLocatedNodeKey: string | null
  viewMode: ViewMode
  controlsCollapsed: boolean
  sortOrders: SortOrderMap
  sortModes: SortModeMap
  layout: FloatingPositions
  panelSize: PanelSize
}

export type RestoredPluginState = PersistedPluginState & {
  panelVisible: boolean
  autoRefreshPaused: boolean
  displayMode: DisplayMode
}

export type GraphScopedPersistedState = PersistedPluginState

export type GraphScopedStateMap = Record<string, GraphScopedPersistedState>

export type TreeStateSnapshot = {
  rootFavorites: string[]
  sortOrders: SortOrderMap
  sortModes: SortModeMap
  sortDragItem: SortableItem | null
  sortFeedback: SortFeedbackState | null
  expandedKeys: Set<string>
  searchCollapsedKeys: Set<string>
  loadedKeys: Set<string>
  loadStates: Map<string, LoadState>
  loadErrors: Map<string, string>
  currentPageName: string | null
  currentPagePath: string[]
  lastLocatedNodeKey: string | null
  flashLocatedNodeKey: string | null
  refreshing: boolean
  searching: boolean
  searchQuery: string
  autoRefreshPaused: boolean
  pollIntervalSeconds: number
  hierarchyProperty: string
  lastRefreshLabel: string
  viewMode: ViewMode
  displayMode: DisplayMode
  canSwitchDisplayMode: boolean
  controlsCollapsed: boolean
  rootSortHasCustomOrder: boolean
  rootSortMode: SortMode
}

export type PageLookup = Pick<PageEntity, 'name' | 'originalName' | 'properties' | 'uuid'>
