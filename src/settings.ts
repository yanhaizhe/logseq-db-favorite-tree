import { DEFAULT_POLL_INTERVAL_SECONDS, INTERNAL_SETTINGS } from './constants'
import type {
  DisplayMode,
  GraphScopedPersistedState,
  GraphScopedStateMap,
  PanelSize,
  PersistedPluginState,
  PluginSettings,
  RestoredPluginState,
  SidebarPosition,
  SortOrderMap,
  ViewMode,
} from './types'

export class FavoriteTreeSettingsStore {
  getHierarchyProperty(): string {
    const value = this.getSettings()?.hierarchyProperty
    return typeof value === 'string' && value.trim() ? value.trim() : 'parent'
  }

  getSidebarPosition(): SidebarPosition {
    return this.getSettings()?.sidebarPosition === 'right' ? 'right' : 'left'
  }

  getPanelWidth(): number {
    const raw = this.getSettings()?.panelWidth
    const numeric = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(numeric)) {
      return 320
    }
    return Math.min(640, Math.max(240, numeric))
  }

  getPollIntervalSeconds(): number {
    const raw = this.getSettings()?.pollIntervalSeconds
    const numeric = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(numeric)) {
      return DEFAULT_POLL_INTERVAL_SECONDS
    }
    return Math.min(3600, Math.max(1, Math.round(numeric)))
  }

  getViewMode(): ViewMode {
    return this.getString(INTERNAL_SETTINGS.viewMode) === 'bubble' ? 'bubble' : 'panel'
  }

  getDisplayMode(): DisplayMode {
    return this.getString(INTERNAL_SETTINGS.displayMode) === 'sidebar' ? 'sidebar' : 'floating'
  }

  readInternalState(graphKey: string): RestoredPluginState {
    const graphState = this.getGraphScopedState(graphKey) ?? this.readLegacyScopedState()

    return {
      panelVisible: this.getBoolean(INTERNAL_SETTINGS.panelVisible, true),
      expandedKeys: graphState.expandedKeys,
      autoRefreshPaused: this.getBoolean(INTERNAL_SETTINGS.autoRefreshPaused, true),
      displayMode: this.getDisplayMode(),
      bodyScrollTop: graphState.bodyScrollTop,
      lastLocatedNodeKey: graphState.lastLocatedNodeKey,
      viewMode: graphState.viewMode,
      controlsCollapsed: graphState.controlsCollapsed,
      sortOrders: graphState.sortOrders,
      layout: graphState.layout,
      panelSize: graphState.panelSize,
    }
  }

  persistInternalState(graphKey: string, state: RestoredPluginState): void {
    const graphStates = this.getAllGraphScopedStates()
    graphStates[graphKey] = this.toGraphScopedState(state)

    logseq.updateSettings({
      [INTERNAL_SETTINGS.panelVisible]: state.panelVisible,
      [INTERNAL_SETTINGS.autoRefreshPaused]: state.autoRefreshPaused,
      [INTERNAL_SETTINGS.displayMode]: state.displayMode,
      [INTERNAL_SETTINGS.graphStates]: JSON.stringify(graphStates),
    })
  }

  private getGraphScopedState(graphKey: string): GraphScopedPersistedState | null {
    const value = this.getSettings()?.[INTERNAL_SETTINGS.graphStates]
    if (typeof value !== 'string' || !value.trim()) {
      return null
    }

    try {
      const parsed = JSON.parse(value) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      const record = parsed as Record<string, unknown>
      const candidate = record[graphKey]
      if (!candidate || typeof candidate !== 'object') {
        return null
      }

      return this.normalizeGraphScopedState(candidate as Record<string, unknown>)
    } catch {
      return null
    }
  }

  private getAllGraphScopedStates(): GraphScopedStateMap {
    const value = this.getSettings()?.[INTERNAL_SETTINGS.graphStates]
    if (typeof value !== 'string' || !value.trim()) {
      return {}
    }

    try {
      const parsed = JSON.parse(value) as unknown
      if (!parsed || typeof parsed !== 'object') {
        return {}
      }

      const result: GraphScopedStateMap = {}
      for (const [key, candidate] of Object.entries(parsed as Record<string, unknown>)) {
        if (!candidate || typeof candidate !== 'object') {
          continue
        }
        result[key] = this.normalizeGraphScopedState(candidate as Record<string, unknown>)
      }
      return result
    } catch {
      return {}
    }
  }

  private readLegacyScopedState(): GraphScopedPersistedState {
    return {
      expandedKeys: this.getStringArray(INTERNAL_SETTINGS.expandedKeys),
      bodyScrollTop: this.getNumber(INTERNAL_SETTINGS.bodyScrollTop, 0),
      lastLocatedNodeKey: this.getString(INTERNAL_SETTINGS.lastLocatedNodeKey),
      viewMode: this.getViewMode(),
      controlsCollapsed: false,
      sortOrders: {},
      layout: {
        panelX: this.getNumber(INTERNAL_SETTINGS.panelX, 0),
        panelY: this.getNumber(INTERNAL_SETTINGS.panelY, 0),
        bubbleX: this.getNumber(INTERNAL_SETTINGS.bubbleX, 0),
        bubbleY: this.getNumber(INTERNAL_SETTINGS.bubbleY, 0),
      },
      panelSize: {
        width: this.getPanelWidth(),
        height: 0,
      },
    }
  }

  private normalizeGraphScopedState(value: Record<string, unknown>): GraphScopedPersistedState {
    return {
      expandedKeys: Array.isArray(value.expandedKeys)
        ? value.expandedKeys.filter((item): item is string => typeof item === 'string')
        : [],
      bodyScrollTop: this.toFiniteNumber(value.bodyScrollTop, 0),
      lastLocatedNodeKey: typeof value.lastLocatedNodeKey === 'string' && value.lastLocatedNodeKey.trim()
        ? value.lastLocatedNodeKey
        : null,
      viewMode: value.viewMode === 'bubble' ? 'bubble' : 'panel',
      controlsCollapsed: Boolean(value.controlsCollapsed),
      sortOrders: this.normalizeSortOrders(value.sortOrders),
      layout: {
        panelX: this.toFiniteNumber((value.layout as Record<string, unknown> | undefined)?.panelX, 0),
        panelY: this.toFiniteNumber((value.layout as Record<string, unknown> | undefined)?.panelY, 0),
        bubbleX: this.toFiniteNumber((value.layout as Record<string, unknown> | undefined)?.bubbleX, 0),
        bubbleY: this.toFiniteNumber((value.layout as Record<string, unknown> | undefined)?.bubbleY, 0),
      },
      panelSize: this.normalizePanelSize(value.panelSize),
    }
  }

  private toGraphScopedState(state: PersistedPluginState): GraphScopedPersistedState {
    return {
      expandedKeys: [...state.expandedKeys],
      bodyScrollTop: Math.max(0, Math.round(state.bodyScrollTop)),
      lastLocatedNodeKey: state.lastLocatedNodeKey,
      viewMode: state.viewMode,
      controlsCollapsed: state.controlsCollapsed,
      sortOrders: this.normalizeSortOrders(state.sortOrders),
      layout: {
        panelX: Math.round(state.layout.panelX),
        panelY: Math.round(state.layout.panelY),
        bubbleX: Math.round(state.layout.bubbleX),
        bubbleY: Math.round(state.layout.bubbleY),
      },
      panelSize: {
        width: Math.round(state.panelSize.width),
        height: Math.round(state.panelSize.height),
      },
    }
  }

  private normalizePanelSize(value: unknown): PanelSize {
    const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
    return {
      width: this.toFiniteNumber(record?.width, this.getPanelWidth()),
      height: this.toFiniteNumber(record?.height, 0),
    }
  }

  private normalizeSortOrders(value: unknown): SortOrderMap {
    if (!value || typeof value !== 'object') {
      return {}
    }

    const result: SortOrderMap = {}
    for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
      if (typeof key !== 'string' || !key.trim() || !Array.isArray(candidate)) {
        continue
      }
      const normalized = candidate.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      if (normalized.length > 0) {
        result[key] = normalized
      }
    }
    return result
  }

  private getSettings(): PluginSettings | undefined {
    return logseq.settings as PluginSettings | undefined
  }

  private getBoolean(key: string, fallback: boolean): boolean {
    const value = this.getSettings()?.[key]
    return typeof value === 'boolean' ? value : fallback
  }

  private getNumber(key: string, fallback: number): number {
    const value = this.getSettings()?.[key]
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  private toFiniteNumber(value: unknown, fallback: number): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
  }

  private getString(key: string): string | null {
    const value = this.getSettings()?.[key]
    return typeof value === 'string' && value.trim() ? value : null
  }

  private getStringArray(key: string): string[] {
    const value = this.getSettings()?.[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }
}
