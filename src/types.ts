import type { PageEntity } from '@logseq/libs/dist/LSPlugin'

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error'
export type ViewMode = 'panel' | 'bubble'
export type DragKind = 'panel' | 'bubble' | 'panel-resize'
export type SidebarPosition = 'left' | 'right'

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
  __panelVisible?: boolean
  __expandedKeys?: string[]
  __autoRefreshPaused?: boolean
  __bodyScrollTop?: number
  __lastLocatedNodeKey?: string
  __viewMode?: ViewMode
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
  layout: FloatingPositions
  panelSize: PanelSize
}

export type RestoredPluginState = PersistedPluginState & {
  panelVisible: boolean
  autoRefreshPaused: boolean
}

export type GraphScopedPersistedState = PersistedPluginState

export type GraphScopedStateMap = Record<string, GraphScopedPersistedState>

export type TreeStateSnapshot = {
  rootFavorites: string[]
  expandedKeys: Set<string>
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
  controlsCollapsed: boolean
}

export type PageLookup = Pick<PageEntity, 'name' | 'originalName' | 'properties' | 'uuid'>
