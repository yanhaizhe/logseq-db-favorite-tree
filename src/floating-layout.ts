import {
  BUBBLE_SIZE,
  DRAG_THRESHOLD_PX,
  MAIN_UI_MARGIN,
  PANEL_MAX_WIDTH,
  PANEL_MAX_HEIGHT,
  PANEL_MIN_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_TOP_OFFSET,
} from './constants'
import type { DragKind, DragState, FloatingFrame, FloatingPositions, PanelSize, SidebarPosition, ViewMode } from './types'

export class FloatingLayoutManager {
  private positions: FloatingPositions = {
    panelX: MAIN_UI_MARGIN,
    panelY: PANEL_TOP_OFFSET,
    bubbleX: MAIN_UI_MARGIN,
    bubbleY: 120,
  }
  private panelSize: PanelSize = {
    width: PANEL_MIN_WIDTH + 40,
    height: PANEL_MIN_HEIGHT,
  }
  private dragState: DragState | null = null
  private dragFrameId: number | null = null

  constructor(private readonly onFrameChange: () => void) {}

  destroy(): void {
    this.dragState = null
    document.body.classList.remove('is-dragging')
    if (this.dragFrameId !== null) {
      window.cancelAnimationFrame(this.dragFrameId)
      this.dragFrameId = null
    }
  }

  restore(
    positions: Partial<FloatingPositions>,
    panelSize: Partial<PanelSize>,
    sidebarPosition: SidebarPosition,
    defaultPanelWidth: number,
  ): void {
    const viewport = this.getViewportSize()
    this.panelSize = this.getClampedPanelSize(panelSize.width ?? defaultPanelWidth, panelSize.height ?? 0)
    const panelDefaults = this.getDefaultPanelPosition(viewport.width, viewport.height, sidebarPosition)
    const bubbleDefaults = this.getDefaultBubblePosition(viewport.width, viewport.height, sidebarPosition)

    this.positions = {
      panelX: positions.panelX && positions.panelX > 0 ? positions.panelX : panelDefaults.x,
      panelY: positions.panelY && positions.panelY > 0 ? positions.panelY : panelDefaults.y,
      bubbleX: positions.bubbleX && positions.bubbleX > 0 ? positions.bubbleX : bubbleDefaults.x,
      bubbleY: positions.bubbleY && positions.bubbleY > 0 ? positions.bubbleY : bubbleDefaults.y,
    }

    this.ensureInViewport(sidebarPosition)
  }

  getPositions(): FloatingPositions {
    return { ...this.positions }
  }

  getPanelSize(): PanelSize {
    return { ...this.panelSize }
  }

  resetPanelSize(defaultPanelWidth: number, sidebarPosition: SidebarPosition): void {
    this.panelSize = this.getClampedPanelSize(defaultPanelWidth, 0)
    this.ensureInViewport(sidebarPosition)
    this.onFrameChange()
  }

  getFrame(viewMode: ViewMode, sidebarPosition: SidebarPosition): FloatingFrame {
    this.ensureInViewport(sidebarPosition)
    return viewMode === 'bubble' ? this.getBubbleFrame() : this.getPanelFrame()
  }

  ensureInViewport(sidebarPosition: SidebarPosition): void {
    const panel = this.getClampedPosition(
      this.positions.panelX,
      this.positions.panelY,
      this.panelSize.width,
      this.panelSize.height,
      MAIN_UI_MARGIN,
      PANEL_TOP_OFFSET,
    )
    const bubble = this.getClampedPosition(this.positions.bubbleX, this.positions.bubbleY, BUBBLE_SIZE, BUBBLE_SIZE)

    this.positions = {
      panelX: panel.x,
      panelY: panel.y,
      bubbleX: bubble.x,
      bubbleY: bubble.y,
    }

    if (!Number.isFinite(this.positions.panelX) || !Number.isFinite(this.positions.bubbleX)) {
      const viewport = this.getViewportSize()
      this.restore({}, this.panelSize, sidebarPosition, this.panelSize.width)
      this.getDefaultPanelPosition(viewport.width, viewport.height, sidebarPosition)
    }
  }

  startDrag(kind: DragKind, event: PointerEvent, handleElement: HTMLElement | null): void {
    if (event.button !== 0) {
      return
    }

    const origin =
      kind === 'panel'
        ? { x: this.positions.panelX, y: this.positions.panelY }
        : { x: this.positions.bubbleX, y: this.positions.bubbleY }

    handleElement?.setPointerCapture?.(event.pointerId)

    this.dragState = {
      kind,
      pointerId: event.pointerId,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
      originX: origin.x,
      originY: origin.y,
      originWidth: this.panelSize.width,
      originHeight: this.panelSize.height,
      moved: false,
      handleElement,
    }

    document.body.classList.add('is-dragging')
    event.preventDefault()
  }

  handlePointerMove(event: PointerEvent, sidebarPosition: SidebarPosition): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return
    }

    const nextX = this.dragState.originX + event.screenX - this.dragState.startScreenX
    const nextY = this.dragState.originY + event.screenY - this.dragState.startScreenY

    if (
      !this.dragState.moved &&
      (Math.abs(event.screenX - this.dragState.startScreenX) >= DRAG_THRESHOLD_PX ||
        Math.abs(event.screenY - this.dragState.startScreenY) >= DRAG_THRESHOLD_PX)
    ) {
      this.dragState.moved = true
    }

    if (this.dragState.kind === 'panel') {
      const panel = this.getClampedPosition(
        nextX,
        nextY,
        this.panelSize.width,
        this.panelSize.height,
        MAIN_UI_MARGIN,
        PANEL_TOP_OFFSET,
      )
      this.positions.panelX = panel.x
      this.positions.panelY = panel.y
    } else if (this.dragState.kind === 'panel-resize') {
      this.panelSize = this.getClampedPanelSize(
        (this.dragState.originWidth ?? this.panelSize.width) + event.screenX - this.dragState.startScreenX,
        (this.dragState.originHeight ?? this.panelSize.height) + event.screenY - this.dragState.startScreenY,
      )
    } else {
      const bubble = this.getClampedPosition(nextX, nextY, BUBBLE_SIZE, BUBBLE_SIZE)
      this.positions.bubbleX = bubble.x
      this.positions.bubbleY = bubble.y
    }

    this.ensureInViewport(sidebarPosition)
    if (this.dragFrameId !== null) {
      return
    }

    this.dragFrameId = window.requestAnimationFrame(() => {
      this.dragFrameId = null
      this.onFrameChange()
    })
  }

  finishDrag(event: PointerEvent, sidebarPosition: SidebarPosition): { moved: boolean; kind: DragKind } | null {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return null
    }

    if (this.dragFrameId !== null) {
      window.cancelAnimationFrame(this.dragFrameId)
      this.dragFrameId = null
    }

    this.ensureInViewport(sidebarPosition)
    if (this.dragState.kind === 'bubble') {
      this.snapBubbleToClosestEdge()
    }
    this.onFrameChange()

    const result = {
      moved: this.dragState.moved,
      kind: this.dragState.kind,
    }

    this.dragState.handleElement?.releasePointerCapture?.(event.pointerId)
    this.dragState = null
    document.body.classList.remove('is-dragging')
    return result
  }

  private snapBubbleToClosestEdge(): void {
    const viewport = this.getViewportSize()
    const maxX = Math.max(MAIN_UI_MARGIN, viewport.width - BUBBLE_SIZE - MAIN_UI_MARGIN)
    const bubbleCenterX = this.positions.bubbleX + BUBBLE_SIZE / 2
    const viewportCenterX = viewport.width / 2

    this.positions.bubbleX = bubbleCenterX < viewportCenterX ? MAIN_UI_MARGIN : maxX
  }

  private getViewportSize(): { width: number; height: number } {
    try {
      const target = window.parent ?? window
      return {
        width: Math.max(320, target.innerWidth || window.innerWidth || document.documentElement.clientWidth || 1280),
        height: Math.max(320, target.innerHeight || window.innerHeight || document.documentElement.clientHeight || 800),
      }
    } catch {
      return {
        width: Math.max(320, window.screen?.availWidth || 3840),
        height: Math.max(320, window.screen?.availHeight || 2160),
      }
    }
  }

  private getDefaultPanelHeight(): number {
    const viewport = this.getViewportSize()
    return Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, viewport.height - MAIN_UI_MARGIN * 2))
  }

  private getPanelFrame(): FloatingFrame {
    return {
      x: this.positions.panelX,
      y: this.positions.panelY,
      width: this.panelSize.width,
      height: this.panelSize.height,
    }
  }

  private getBubbleFrame(): FloatingFrame {
    return {
      x: this.positions.bubbleX,
      y: this.positions.bubbleY,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
    }
  }

  private getDefaultPanelPosition(
    viewportWidth: number,
    viewportHeight: number,
    sidebarPosition: SidebarPosition,
  ): { x: number; y: number } {
    const x = sidebarPosition === 'right' ? viewportWidth - this.panelSize.width - MAIN_UI_MARGIN : MAIN_UI_MARGIN
    return this.getClampedPosition(x, PANEL_TOP_OFFSET, this.panelSize.width, this.panelSize.height)
  }

  private getDefaultBubblePosition(
    viewportWidth: number,
    viewportHeight: number,
    sidebarPosition: SidebarPosition,
  ): { x: number; y: number } {
    const x = sidebarPosition === 'right' ? viewportWidth - BUBBLE_SIZE - MAIN_UI_MARGIN : MAIN_UI_MARGIN
    const y = viewportHeight - BUBBLE_SIZE - 96
    return this.getClampedPosition(x, y, BUBBLE_SIZE, BUBBLE_SIZE)
  }

  private getClampedPosition(
    x: number,
    y: number,
    width: number,
    height: number,
    minX = MAIN_UI_MARGIN,
    minY = MAIN_UI_MARGIN,
  ): { x: number; y: number } {
    const viewport = this.getViewportSize()
    const maxX = Math.max(minX, viewport.width - width - MAIN_UI_MARGIN)
    const maxY = Math.max(minY, viewport.height - height - MAIN_UI_MARGIN)

    return {
      x: Math.round(Math.min(maxX, Math.max(minX, x))),
      y: Math.round(Math.min(maxY, Math.max(minY, y))),
    }
  }

  private getClampedPanelSize(width: number, height: number): PanelSize {
    const viewport = this.getViewportSize()
    const maxWidth = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, viewport.width - MAIN_UI_MARGIN * 2))
    const maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, viewport.height - MAIN_UI_MARGIN * 2))

    return {
      width: Math.round(Math.min(maxWidth, Math.max(PANEL_MIN_WIDTH, width))),
      height: Math.round(Math.min(maxHeight, Math.max(PANEL_MIN_HEIGHT, height || this.getDefaultPanelHeight()))),
    }
  }
}
