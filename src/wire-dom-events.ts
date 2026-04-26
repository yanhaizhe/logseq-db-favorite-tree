import type { DragKind } from './types'

export type FavoriteTreeDOMHandlers = {
  onStartDrag: (kind: DragKind, event: PointerEvent, handleElement: HTMLElement | null) => void
  onHeaderDoubleClick: () => void
  onSearchQueryChange: (value: string) => void
  onToggleControls: () => void
  onResetPanelSize: () => void
  onRefresh: () => void
  onToggleAutoRefresh: () => void
  onToggleExpandAll: () => void
  onLocateCurrent: () => void
  onOpenSettings: () => void
  onCollapseToBubble: () => void
  onExpandPanel: () => void
  onClose: () => void
  onToggleNode: (key: string) => void
  onOpenPage: (page: string) => void
  shouldIgnoreBubbleClick: () => boolean
}

export function wireDOMEvents(root: HTMLElement, handlers: FavoriteTreeDOMHandlers): void {
  root.addEventListener('pointerdown', (event) => {
    const source = event.target as HTMLElement | null
    if (source?.closest<HTMLElement>('[data-no-drag="true"]')) {
      return
    }
    const handle = source?.closest<HTMLElement>('[data-drag-handle]')
    if (!handle) {
      return
    }

    const actionTarget = source?.closest<HTMLElement>('[data-action]')
    if (actionTarget && actionTarget !== handle) {
      return
    }

    const kind = handle.dataset.dragHandle
    if (kind === 'panel' || kind === 'bubble' || kind === 'panel-resize') {
      handlers.onStartDrag(kind, event, handle)
    }
  })

  root.addEventListener('dblclick', (event) => {
    const source = event.target as HTMLElement | null
    if (source?.closest<HTMLElement>('[data-no-drag="true"]')) {
      return
    }
    const header = source?.closest<HTMLElement>('[data-drag-handle="panel"]')
    if (!header) {
      return
    }

    const actionTarget = source?.closest<HTMLElement>('[data-action]')
    if (actionTarget && actionTarget !== header) {
      return
    }

    event.preventDefault()
    handlers.onHeaderDoubleClick()
  })

  root.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement | null
    if (!target || target.dataset.role !== 'search-input') {
      return
    }

    handlers.onSearchQueryChange(target.value)
  })

  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]')
    if (!target) {
      return
    }

    const action = target.dataset.action
    if (action === 'toggle-controls') {
      handlers.onToggleControls()
      return
    }
    if (action === 'reset-panel-size') {
      handlers.onResetPanelSize()
      return
    }
    if (action === 'refresh') {
      handlers.onRefresh()
      return
    }
    if (action === 'toggle-auto-refresh') {
      handlers.onToggleAutoRefresh()
      return
    }
    if (action === 'toggle-expand-all') {
      handlers.onToggleExpandAll()
      return
    }
    if (action === 'locate-current') {
      handlers.onLocateCurrent()
      return
    }
    if (action === 'settings') {
      handlers.onOpenSettings()
      return
    }
    if (action === 'collapse-to-bubble') {
      handlers.onCollapseToBubble()
      return
    }
    if (action === 'expand-panel') {
      if (handlers.shouldIgnoreBubbleClick()) {
        return
      }
      handlers.onExpandPanel()
      return
    }
    if (action === 'close') {
      handlers.onClose()
      return
    }
    if (action === 'toggle-node') {
      const key = target.dataset.key
      if (key) {
        handlers.onToggleNode(key)
      }
      return
    }
    if (action === 'open-page') {
      const page = target.dataset.page
      if (page) {
        handlers.onOpenPage(page)
      }
    }
  })

  root.addEventListener('keydown', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action="expand-panel"]')
    if (!target) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (handlers.shouldIgnoreBubbleClick()) {
        return
      }
      handlers.onExpandPanel()
    }
  })
}
