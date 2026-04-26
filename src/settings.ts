import { DEFAULT_POLL_INTERVAL_SECONDS, INTERNAL_SETTINGS } from './constants'
import type { PersistedPluginState, PluginSettings, RestoredPluginState, SidebarPosition, ViewMode } from './types'

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

  readInternalState(): RestoredPluginState {
    return {
      panelVisible: this.getBoolean(INTERNAL_SETTINGS.panelVisible, true),
      expandedKeys: this.getStringArray(INTERNAL_SETTINGS.expandedKeys),
      autoRefreshPaused: this.getBoolean(INTERNAL_SETTINGS.autoRefreshPaused, false),
      bodyScrollTop: this.getNumber(INTERNAL_SETTINGS.bodyScrollTop, 0),
      lastLocatedNodeKey: this.getString(INTERNAL_SETTINGS.lastLocatedNodeKey),
      viewMode: this.getViewMode(),
      layout: {
        panelX: this.getNumber(INTERNAL_SETTINGS.panelX, 0),
        panelY: this.getNumber(INTERNAL_SETTINGS.panelY, 0),
        bubbleX: this.getNumber(INTERNAL_SETTINGS.bubbleX, 0),
        bubbleY: this.getNumber(INTERNAL_SETTINGS.bubbleY, 0),
      },
    }
  }

  persistInternalState(state: PersistedPluginState): void {
    logseq.updateSettings({
      [INTERNAL_SETTINGS.panelVisible]: state.panelVisible,
      [INTERNAL_SETTINGS.expandedKeys]: state.expandedKeys,
      [INTERNAL_SETTINGS.autoRefreshPaused]: state.autoRefreshPaused,
      [INTERNAL_SETTINGS.bodyScrollTop]: Math.max(0, Math.round(state.bodyScrollTop)),
      [INTERNAL_SETTINGS.lastLocatedNodeKey]: state.lastLocatedNodeKey,
      [INTERNAL_SETTINGS.viewMode]: state.viewMode,
      [INTERNAL_SETTINGS.panelX]: Math.round(state.layout.panelX),
      [INTERNAL_SETTINGS.panelY]: Math.round(state.layout.panelY),
      [INTERNAL_SETTINGS.bubbleX]: Math.round(state.layout.bubbleX),
      [INTERNAL_SETTINGS.bubbleY]: Math.round(state.layout.bubbleY),
    })
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

  private getString(key: string): string | null {
    const value = this.getSettings()?.[key]
    return typeof value === 'string' && value.trim() ? value : null
  }

  private getStringArray(key: string): string[] {
    const value = this.getSettings()?.[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }
}
