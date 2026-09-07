import type { PageLookup } from './types'

export function pageTitle(page: Partial<PageLookup> | null | undefined): string | null {
  if (!page || typeof page !== 'object') {
    return null
  }

  const original = typeof page.originalName === 'string' ? page.originalName.trim() : ''
  if (original) {
    return original
  }

  const name = typeof page.name === 'string' ? page.name.trim() : ''
  return name || null
}

export function normalizeTitle(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

export function normalizeFavoriteSeeds(value: unknown): string[] {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeFavoriteSeeds(item))
  }

  if (typeof value === 'string') {
    const normalized = normalizeFavoriteSeed(value)
    return normalized ? [normalized] : []
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidates = [record.name, record.originalName, record.page, record.title, record.label]

    for (const candidate of candidates) {
      const normalized = normalizeFavoriteSeed(candidate)
      if (normalized) {
        return [normalized]
      }
    }

    if (record.id) {
      const normalized = normalizeFavoriteSeed(record.id)
      if (normalized) {
        return [normalized]
      }
    }
  }

  return []
}

export function normalizeFavoriteSeed(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const routeMatch = trimmed.match(/(?:^|\/)page\/(.+)$/i)
  if (routeMatch?.[1]) {
    return decodeURIComponent(routeMatch[1]).trim()
  }

  return unwrapPageRef(trimmed)
}

export function unwrapPageRef(value: string): string {
  const trimmed = value.trim()
  const refMatch = trimmed.match(/^\[\[([\s\S]+)\]\]$/)
  if (refMatch?.[1]) {
    return refMatch[1].trim()
  }
  return trimmed
}

export function uniqueTitlesFromValues(values: unknown[]): string[] {
  const unique = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    for (const title of normalizePropertyReferences(value)) {
      const normalized = normalizeTitle(title)
      if (!normalized || unique.has(normalized)) {
        continue
      }
      unique.add(normalized)
      result.push(title)
    }
  }

  return result
}

export function findPropertyValue(properties: Record<string, unknown>, propertyName: string): unknown {
  if (propertyName in properties) {
    return properties[propertyName]
  }

  const target = normalizePropertyLookupKey(propertyName)
  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = normalizePropertyLookupKey(key)
    if (normalizedKey === target) {
      return value
    }

    const lastSegment = normalizedKey.split('/').pop() ?? normalizedKey
    if (lastSegment === target || lastSegment.startsWith(`${target}-`)) {
      return value
    }

    if (normalizedKey.includes(`/${target}-`) || normalizedKey.endsWith(`/${target}`)) {
      return value
    }
  }

  return undefined
}

export function normalizePropertyLookupKey(value: string | null | undefined): string {
  if (value == null) {
    return ''
  }
  return value.trim().replace(/^:/, '').toLocaleLowerCase()
}

export function normalizePropertyReferences(value: unknown): string[] {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizePropertyReferences(item))
  }

  if (typeof value === 'string') {
    const linkedMatches = [...value.matchAll(/\[\[([^\]]+)\]\]/g)]
      .map((match) => match[1]?.trim())
      .filter((item): item is string => Boolean(item))
    if (linkedMatches.length > 0) {
      return linkedMatches
    }

    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    if (typeof record.originalName === 'string' && record.originalName.trim()) {
      return [record.originalName.trim()]
    }

    if (typeof record.name === 'string' && record.name.trim()) {
      return [record.name.trim()]
    }

    if (Array.isArray(record.title)) {
      const joined = record.title.join('').trim()
      return joined ? [joined] : []
    }

    if ('value' in record) {
      return normalizePropertyReferences(record.value)
    }
  }

  return []
}

export function escapeHtml(value: string | null | undefined): string {
  if (value == null) {
    return ''
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeSelectorValue(value: string | null | undefined): string {
  if (value == null) {
    return ''
  }
  if (window.CSS?.escape) {
    return window.CSS.escape(value)
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const PAGE_DELETED_FLAGS = [
  'deleted',
  'deleted?',
  'isDeleted',
  'is-deleted',
  'trashed',
  'trash',
  'inTrash',
  'in-trash',
  'archived',
  'archived?',
  'isArchived',
  'is-archived',
] as const

export function isPageDeletedLike(page: Record<string, unknown>): boolean {
  for (const key of PAGE_DELETED_FLAGS) {
    if (page[key] === true) {
      return true
    }
  }

  const properties = page.properties
  if (properties && typeof properties === 'object') {
    const record = properties as Record<string, unknown>
    for (const key of PAGE_DELETED_FLAGS) {
      if (record[key] === true) {
        return true
      }
      if (record[`:${key}`] === true) {
        return true
      }
    }
  }

  return false
}

export function isTreeRelevantDBChangeEvent(
  event: unknown,
  hierarchyPropertyName = 'parent',
): boolean {
  if (!event || typeof event !== 'object') {
    return true
  }

  const changeEvent = event as {
    blocks?: unknown
    txData?: unknown
    txMeta?: unknown
  }

  const { blocks, txData } = changeEvent

  if (txData === undefined && blocks === undefined) {
    return true
  }

  const hierarchyProp = normalizePropertyLookupKey(hierarchyPropertyName)
  const targetPropertyKeys = new Set([
    'tags',
    'page-tags',
    'page tags',
    'favorite',
    'favorites',
  ])
  if (hierarchyProp) {
    targetPropertyKeys.add(hierarchyProp)
  }

  // 1. Primary check: txData (DataScript/Datomic datoms)
  if (Array.isArray(txData)) {
    if (txData.length === 0 && (!Array.isArray(blocks) || blocks.length === 0)) {
      return false
    }

    for (const datom of txData) {
      if (!Array.isArray(datom) || datom.length < 2) {
        continue
      }

      const attr = datom[1]
      if (typeof attr !== 'string') {
        continue
      }

      const cleanAttr = normalizePropertyLookupKey(attr)

      // Skip internal outliner structure (block tree, not page hierarchy)
      if (cleanAttr === 'block/parent' || cleanAttr === 'block/left' || cleanAttr === 'block/format') {
        continue
      }

      // Title & page identity mutations
      if (
        cleanAttr === 'page/name' ||
        cleanAttr === 'page/original-name' ||
        cleanAttr === 'page/title' ||
        cleanAttr === 'block/name' ||
        cleanAttr === 'block/original-name' ||
        cleanAttr === 'block/title' ||
        cleanAttr === 'logseq.page/name' ||
        cleanAttr === 'logseq.page/original-name' ||
        cleanAttr === 'page/uuid'
      ) {
        return true
      }

      // Direct tag mutations
      if (
        cleanAttr === 'block/tags' ||
        cleanAttr === 'page/tags' ||
        cleanAttr === 'block/page-tags' ||
        cleanAttr === 'tags' ||
        cleanAttr.endsWith('/tags')
      ) {
        return true
      }

      // Property container mutations (check if hierarchy property or tags are present inside)
      if (
        cleanAttr === 'block/properties' ||
        cleanAttr === 'page/properties' ||
        cleanAttr === 'block/properties-order' ||
        cleanAttr === 'page/properties-order'
      ) {
        const propValue = datom[2]
        if (propValue && typeof propValue === 'object' && !Array.isArray(propValue)) {
          const propObj = propValue as Record<string, unknown>
          for (const key of Object.keys(propObj)) {
            const cleanKey = normalizePropertyLookupKey(key)
            if (
              targetPropertyKeys.has(cleanKey) ||
              (hierarchyProp && cleanKey.includes(hierarchyProp))
            ) {
              return true
            }
          }
        } else {
          return true
        }
      }

      // Direct schema attribute mutations (DB graphs / properties)
      if (
        targetPropertyKeys.has(cleanAttr) ||
        cleanAttr.startsWith('property/') ||
        cleanAttr.startsWith('page.property/') ||
        (hierarchyProp && (cleanAttr.endsWith(`/${hierarchyProp}`) || cleanAttr.includes(hierarchyProp)))
      ) {
        return true
      }
    }

    // Evaluated txData and found only non-relevant mutations (content, timestamps, outliner ops)
    return false
  }

  // 2. Secondary check: blocks array
  if (Array.isArray(blocks)) {
    if (blocks.length === 0) {
      return false
    }

    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue
      }

      const blockRecord = block as Record<string, unknown>
      if (
        blockRecord.type === 'page' ||
        typeof blockRecord.name === 'string' ||
        typeof blockRecord.originalName === 'string'
      ) {
        return true
      }

      const properties = blockRecord.properties
      if (properties && typeof properties === 'object') {
        for (const key of Object.keys(properties as Record<string, unknown>)) {
          const cleanKey = normalizePropertyLookupKey(key)
          if (
            targetPropertyKeys.has(cleanKey) ||
            (hierarchyProp && cleanKey.includes(hierarchyProp))
          ) {
            return true
          }
        }
      }
    }

    return false
  }

  return true
}

