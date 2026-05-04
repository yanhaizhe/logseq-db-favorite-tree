import type { DragKind, SortDropTarget, SortableItem } from './types'
import { escapeSelectorValue } from './utils'

export type FavoriteTreeDOMHandlers = {
  onStartDrag: (kind: DragKind, event: PointerEvent, handleElement: HTMLElement | null) => void
  onHeaderDoubleClick: () => void
  onSearchQueryChange: (value: string) => void
  onCreateChildDraftChange: (value: string) => void
  onToggleControls: () => void
  onSwitchDisplayMode: () => void
  onResetPanelSize: () => void
  onRefresh: () => void
  onToggleAutoRefresh: () => void
  onToggleExpandAll: () => void
  onLocateCurrent: () => void
  onFocusCurrentPath: () => void
  onCollapseOtherBranches: () => void
  onFocusPreviousSearchMatch: () => void
  onFocusNextSearchMatch: () => void
  onOpenSettings: () => void
  onCollapseToBubble: () => void
  onExpandPanel: () => void
  onClose: () => void
  onToggleNode: (key: string) => void
  onOpenPage: (page: string) => void
  onCreateChildPage: (page: string) => void
  onSubmitCreateChild: () => void
  onCancelCreateChild: () => void
  onOpenPageInSidebar: (page: string) => void
  onToggleSortMode: (parentKey: string) => void
  onClearCustomSort: (parentKey: string) => void
  onStartSortDrag: (item: SortableItem) => void
  onMoveSortDropTarget: (target: SortDropTarget) => boolean
  onFinishSortDrop: (target: SortDropTarget) => boolean
  onEndSortDrag: () => void
  shouldIgnoreBubbleClick: () => boolean
}

export function wireDOMEvents(root: HTMLElement, handlers: FavoriteTreeDOMHandlers): void {
  let activeSortMarker: HTMLElement | null = null
  let activeSortDragSource: HTMLElement | null = null
  let isComposing = false

  const clearSortMarker = (): void => {
    if (!activeSortMarker) {
      return
    }
    activeSortMarker.classList.remove('is-sort-before', 'is-sort-after')
    activeSortMarker = null
  }

  const clearSortDragSource = (): void => {
    if (!activeSortDragSource) {
      return
    }
    activeSortDragSource.classList.remove('is-sort-dragging')
    activeSortDragSource = null
  }

  const readSortableItem = (element: HTMLElement | null): SortableItem | null => {
    const itemId = element?.dataset.sortItemId
    const parentKey = element?.dataset.sortParentKey
    const title = element?.dataset.sortTitle
    if (!itemId || !parentKey || !title) {
      return null
    }
    return { itemId, parentKey, title }
  }

  const readDropTarget = (event: DragEvent): { row: HTMLElement; target: SortDropTarget } | null => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-sort-item-id]')
    if (!row) {
      return null
    }

    const item = readSortableItem(row)
    if (!item) {
      return null
    }

    const rect = row.getBoundingClientRect()
    const placement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
    return {
      row,
      target: {
        ...item,
        placement,
      },
    }
  }

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
    if (!target) {
      return
    }

    if (target.dataset.role === 'search-input') {
      if (!isComposing) {
        handlers.onSearchQueryChange(target.value)
      }
      return
    }

    if (target.dataset.role === 'create-child-input') {
      handlers.onCreateChildDraftChange(target.value)
    }
  })

  root.addEventListener('compositionstart', () => {
    isComposing = true
  })

  root.addEventListener('compositionend', (event) => {
    isComposing = false
    const target = event.target as HTMLInputElement | null
    if (target?.dataset.role === 'search-input') {
      handlers.onSearchQueryChange(target.value)
    }
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
    if (action === 'switch-display-mode') {
      handlers.onSwitchDisplayMode()
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
    if (action === 'focus-current-path') {
      handlers.onFocusCurrentPath()
      return
    }
    if (action === 'collapse-other-branches') {
      handlers.onCollapseOtherBranches()
      return
    }
    if (action === 'search-prev-match') {
      handlers.onFocusPreviousSearchMatch()
      return
    }
    if (action === 'search-next-match') {
      handlers.onFocusNextSearchMatch()
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
      return
    }
    if (action === 'create-child-page') {
      const page = target.dataset.page
      if (page) {
        handlers.onCreateChildPage(page)
      }
      return
    }
    if (action === 'submit-create-child') {
      handlers.onSubmitCreateChild()
      return
    }
    if (action === 'cancel-create-child') {
      handlers.onCancelCreateChild()
      return
    }
    if (action === 'open-page-in-sidebar') {
      const page = target.dataset.page
      if (page) {
        handlers.onOpenPageInSidebar(page)
      }
      return
    }
    if (action === 'toggle-sort-mode') {
      const parentKey = target.dataset.parentKey
      if (parentKey) {
        handlers.onToggleSortMode(parentKey)
      }
      return
    }
    if (action === 'clear-custom-sort') {
      const parentKey = target.dataset.parentKey
      if (parentKey) {
        handlers.onClearCustomSort(parentKey)
      }
    }
  })

  root.addEventListener('dragstart', (event) => {
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-sort-handle="true"]') ?? null
    const item = readSortableItem(handle)
    if (!handle || !item) {
      return
    }

    const row = handle.closest<HTMLElement>('[data-sort-item-id]')
    if (row) {
      clearSortDragSource()
      activeSortDragSource = row
      row.classList.add('is-sort-dragging')
    }

    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', item.itemId)
      event.dataTransfer.effectAllowed = 'move'

      if (row) {
        const ghost = row.cloneNode(true) as HTMLElement
        ghost.style.opacity = '0.6'
        ghost.style.position = 'absolute'
        ghost.style.top = '-9999px'
        ghost.style.width = `${row.offsetWidth}px`
        document.body.appendChild(ghost)
        event.dataTransfer.setDragImage(ghost, event.offsetX, event.offsetY)
        ghost.remove()
      }
    }

    handlers.onStartSortDrag(item)
  })

  root.addEventListener('dragover', (event) => {
    const drop = readDropTarget(event)
    if (!drop) {
      clearSortMarker()
      return
    }

    if (!handlers.onMoveSortDropTarget(drop.target)) {
      clearSortMarker()
      return
    }

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }

    clearSortMarker()
    activeSortMarker = drop.row
    activeSortMarker.classList.add(drop.target.placement === 'before' ? 'is-sort-before' : 'is-sort-after')
  })

  root.addEventListener('drop', (event) => {
    const drop = readDropTarget(event)
    clearSortMarker()
    if (!drop) {
      clearSortDragSource()
      handlers.onEndSortDrag()
      return
    }

    event.preventDefault()
    const targetItemId = drop.target.itemId
    if (!handlers.onFinishSortDrop(drop.target)) {
      clearSortDragSource()
      handlers.onEndSortDrag()
      return
    }

    clearSortDragSource()

    requestAnimationFrame(() => {
      const newRow = root.querySelector<HTMLElement>(
        `[data-sort-item-id="${escapeSelectorValue(targetItemId)}"]`,
      )
      if (newRow) {
        newRow.classList.add('is-sort-flash')
        newRow.addEventListener(
          'animationend',
          () => {
            newRow.classList.remove('is-sort-flash')
          },
          { once: true },
        )
      }
    })
  })

  root.addEventListener('dragend', () => {
    clearSortMarker()
    clearSortDragSource()
    handlers.onEndSortDrag()
  })

  root.addEventListener('keydown', (event) => {
    const createChildInput = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-role="create-child-input"]')
    if (createChildInput) {
      if (event.key === 'Enter') {
        event.preventDefault()
        handlers.onSubmitCreateChild()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        handlers.onCancelCreateChild()
        return
      }
    }

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
