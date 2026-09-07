import type { PageLookup } from './types'

export function pageTitle(page: Partial<PageLookup> | null | undefined): string | null {
  if (!page || typeof page !== 'object') {
    return null
  }

  const record = page as Record<string, unknown>
  const original =
    record[':block/original-name'] ??
    record['block/original-name'] ??
    record['original-name'] ??
    page.originalName ??
    record[':block/title'] ??
    record['block/title'] ??
    record.title
  if (typeof original === 'string' && original.trim()) {
    return original.trim()
  }
  if (Array.isArray(original)) {
    const joined = original.join('').trim()
    if (joined) {
      return joined
    }
  }

  const name =
    record[':block/name'] ??
    record['block/name'] ??
    page.name
  if (typeof name === 'string' && name.trim()) {
    return name.trim()
  }

  return null
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

    const original =
      record[':block/original-name'] ??
      record['block/original-name'] ??
      record['original-name'] ??
      record.originalName
    if (typeof original === 'string' && original.trim()) {
      return [original.trim()]
    }

    const name =
      record[':block/name'] ??
      record['block/name'] ??
      record.name
    if (typeof name === 'string' && name.trim()) {
      return [name.trim()]
    }

    const title =
      record[':block/title'] ??
      record['block/title'] ??
      record.title
    if (typeof title === 'string' && title.trim()) {
      return [title.trim()]
    }
    if (Array.isArray(title)) {
      const joined = title.join('').trim()
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

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      return successful
    } catch {
      return false
    }
  }

  return false
}

export function extractErrorMessage(error: unknown, fallback: string = ''): string {
  if (!error) {
    return fallback
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>
    for (const key of ['message', 'msg', 'error', 'reason', 'detail']) {
      const val = record[key]
      if (typeof val === 'string' && val.trim()) {
        return val.trim()
      }
    }
  }
  return fallback
}
