import type { BlockEntity, IDatom } from '@logseq/libs/dist/LSPlugin'
import { findPropertyValue, normalizePropertyLookupKey } from './utils'

export const DEFAULT_PAGE_TAG_PROPERTIES = ['tags', 'page tags', 'page-tags'] as const

/**
 * Attributes that represent pure outliner block editing, line splitting,
 * or content mutations that should NEVER trigger a directory tree refresh,
 * UNLESS their content contains explicit property syntax (e.g. tags:: or parent::).
 */
const PURE_BLOCK_ATTRIBUTES = new Set([
  ':block/content',
  'block/content',
  ':block/title',
  'block/title',
  ':block/left',
  'block/left',
  ':block/parent',
  'block/parent',
  ':block/order',
  'block/order',
  ':block/uuid',
  'block/uuid',
  ':block/page',
  'block/page',
  ':block/pre-block?',
  'block/pre-block?',
  ':block/collapsed?',
  'block/collapsed?',
  ':block/format',
  'block/format',
  ':block/refs',
  'block/refs',
  ':db/txInstant',
  'db/txInstant',
  ':logseq.property/updated-at',
  'logseq.property/updated-at',
  ':logseq.property/created-at',
  'logseq.property/created-at',
])

const PURE_OUTLINER_OPS = new Set([
  'insert-blocks',
  'split-block',
  'save-block',
  'move-blocks',
  'delete-blocks',
  'change-block-collapsed',
])

export type DbChangePayload = {
  blocks?: Array<Partial<BlockEntity> & Record<string, unknown>>
  txData?: IDatom[]
  txMeta?: {
    outlinerOp?: string
    [key: string]: unknown
  }
}

/**
 * Checks if a string contains Logseq property assignment syntax for any of targetProperties,
 * e.g. "tags:: [[Parent]]" or "parent:: [[Parent]]".
 */
export function hasPropertySyntax(text: unknown, targetProperties: string[]): boolean {
  if (typeof text !== 'string') {
    return false
  }

  for (const prop of targetProperties) {
    const escaped = prop.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*::`, 'i')
    if (regex.test(text)) {
      return true
    }
  }

  return false
}

/**
 * Normalizes an attribute identifier (handles string, keyword object, or symbol).
 */
export function extractAttributeString(attr: unknown): string {
  if (typeof attr === 'string') {
    return attr
  }
  if (attr && typeof attr === 'object') {
    const record = attr as Record<string, unknown>
    if (typeof record.str === 'string') {
      return record.str
    }
    if (typeof record.name === 'string') {
      return record.ns ? `:${record.ns}/${record.name}` : `:${record.name}`
    }
  }
  return String(attr ?? '')
}

/**
 * Checks whether an attribute name matches any of the target property keys.
 * Reuses the matching semantics established in `findPropertyValue` and `normalizePropertyLookupKey`:
 * - Strips leading colon
 * - Case-insensitive
 * - Direct match, last path segment match (e.g. `user.property/parent` -> `parent`),
 *   or suffix match.
 *
 * NOTE: `:block/parent` is excluded because it is an outliner structural attribute,
 * not a user hierarchy property.
 */
export function isMatchingPropertyKey(attr: string, targetProperties: string[]): boolean {
  const normalizedAttr = normalizePropertyLookupKey(attr)
  if (!normalizedAttr || normalizedAttr === 'block/parent') {
    return false
  }

  const lastSegment = normalizedAttr.split('/').pop() ?? normalizedAttr

  for (const targetProp of targetProperties) {
    const target = normalizePropertyLookupKey(targetProp)
    if (!target) {
      continue
    }

    if (normalizedAttr === target) {
      return true
    }

    if (lastSegment === target || lastSegment.startsWith(`${target}-`)) {
      return true
    }

    if (normalizedAttr.includes(`/${target}-`) || normalizedAttr.endsWith(`/${target}`)) {
      return true
    }
  }

  return false
}

/**
 * Determines whether a given datom attribute represents a page tag, property,
 * page lifecycle, or favorites change that warrants refreshing the tree.
 */
export function isRelevantDatomAttribute(attrRaw: unknown, targetProperties: string[], value?: unknown): boolean {
  const attr = extractAttributeString(attrRaw)

  // If this is block content or title, check if it contains property assignment syntax (e.g. tags:: or parent::)
  if (
    attr === ':block/content' ||
    attr === 'block/content' ||
    attr === ':block/title' ||
    attr === 'block/title'
  ) {
    return hasPropertySyntax(value, targetProperties)
  }

  if (PURE_BLOCK_ATTRIBUTES.has(attr)) {
    return false
  }

  // 1. Explicit page tag attributes
  if (attr === ':block/tags' || attr === 'block/tags' || attr === ':block/link' || attr === 'block/link') {
    return true
  }

  // 2. Class / Tag inheritance properties
  if (
    attr === ':logseq.property.class/extends' ||
    attr === 'logseq.property.class/extends' ||
    attr === ':logseq.property.class/properties' ||
    attr === 'logseq.property.class/properties'
  ) {
    return true
  }

  // 3. Properties container
  if (attr === ':block/properties' || attr === 'block/properties') {
    return true
  }

  // 4. Page identity / lifecycle changes
  if (
    attr === ':block/name' ||
    attr === 'block/name' ||
    attr === ':block/original-name' ||
    attr === 'block/original-name' ||
    attr === ':block/trash?' ||
    attr === 'block/trash?' ||
    attr === ':block/deleted?' ||
    attr === 'block/deleted?'
  ) {
    return true
  }

  // 5. Page type creation / deletion
  if ((attr === ':block/type' || attr === 'block/type') && value === 'page') {
    return true
  }

  // 6. Favorites configuration changes
  const normalized = normalizePropertyLookupKey(attr)
  if (normalized.includes('favorite')) {
    return true
  }

  // 7. Check if attribute matches user hierarchy property or tag property keys
  if (isMatchingPropertyKey(attr, targetProperties)) {
    return true
  }

  return false
}

const BUILTIN_BLOCK_FIELDS = new Set([
  'id',
  'uuid',
  'parent',
  'page',
  'left',
  'format',
  'content',
  'title',
  'children',
  'preBlock',
  'collapsed',
  'meta',
  'path',
])

/**
 * Checks whether any block in payload.blocks represents a page or block
 * where tags or target properties were modified.
 */
export function hasRelevantBlockChanges(
  blocks: Array<Partial<BlockEntity> & Record<string, unknown>>,
  targetProperties: string[],
): boolean {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      continue
    }

    // Check if block has tags
    const tags = block.tags ?? block[':block/tags'] ?? block['block/tags']
    if (tags != null && (Array.isArray(tags) ? tags.length > 0 : true)) {
      return true
    }

    // Check if block has properties matching targetProperties
    const properties = (block.properties ?? block[':block/properties'] ?? block['block/properties']) as
      | Record<string, unknown>
      | undefined
    if (properties && typeof properties === 'object') {
      for (const prop of targetProperties) {
        if (findPropertyValue(properties, prop) !== undefined) {
          return true
        }
      }
    }

    // Check top-level non-builtin properties on the block (e.g. :user.property/parent)
    for (const [key, val] of Object.entries(block)) {
      if (BUILTIN_BLOCK_FIELDS.has(key)) {
        continue
      }
      if (val != null && isMatchingPropertyKey(key, targetProperties)) {
        return true
      }
    }

    // Check content for property syntax (e.g. tags:: or parent::)
    const content = block.content ?? block[':block/content'] ?? block.title ?? block[':block/title']
    if (hasPropertySyntax(content, targetProperties)) {
      return true
    }
  }

  return false
}

/**
 * Main decider function for `logseq.DB.onChanged`.
 * Returns `true` only when the transaction involves adding, removing, or modifying
 * page tag values, hierarchy property values, page creation/renaming/deletion, or favorites.
 * Returns `false` for normal line breaking, typing, block splitting, indenting, etc.
 */
export function shouldRefreshOnDbChange(payload: DbChangePayload | undefined | null, hierarchyProperty: string): boolean {
  if (!payload) {
    return false
  }

  const targetProperties = Array.from(
    new Set([hierarchyProperty, ...DEFAULT_PAGE_TAG_PROPERTIES]),
  ).filter(Boolean)

  const txData = payload.txData
  if (Array.isArray(txData) && txData.length > 0) {
    for (const datom of txData) {
      if (!Array.isArray(datom) || datom.length < 2) {
        continue
      }
      const attr = datom[1]
      const value = datom[2]

      if (isRelevantDatomAttribute(attr, targetProperties, value)) {
        return true
      }
    }

    // Check blocks in payload as secondary confirmation
    if (Array.isArray(payload.blocks) && payload.blocks.length > 0) {
      if (hasRelevantBlockChanges(payload.blocks, targetProperties)) {
        return true
      }
    }

    return false
  }

  // Fallback if txData is not available: check txMeta and blocks
  const outlinerOp = payload.txMeta?.outlinerOp
  if (typeof outlinerOp === 'string' && PURE_OUTLINER_OPS.has(outlinerOp)) {
    if (Array.isArray(payload.blocks) && hasRelevantBlockChanges(payload.blocks, targetProperties)) {
      return true
    }
    return false
  }

  if (Array.isArray(payload.blocks) && payload.blocks.length > 0) {
    return hasRelevantBlockChanges(payload.blocks, targetProperties)
  }

  return false
}
