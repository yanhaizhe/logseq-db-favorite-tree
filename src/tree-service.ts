import type { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { findPropertyValue, isPageDeletedLike, normalizeFavoriteSeed, normalizeFavoriteSeeds, normalizeTitle, pageTitle, uniqueTitlesFromValues } from './utils'

export class FavoriteTreeTreeService {
  private childIndex: Map<string, string[]> | null = null
  private childIndexPromise: Promise<void> | null = null
  private allPageCache: { at: number; pages: PageEntity[] } | null = null
  private pageParentCache = new Map<string, { updatedAt: number; parentTitles: string[] }>()
  private lastIndexBuildMs: number | null = null
  private lastIndexBuildPageCount: number | null = null

  hasChildIndex(): boolean {
    return this.childIndex !== null
  }

  invalidateIndex(): void {
    this.childIndex = null
    this.childIndexPromise = null
    this.allPageCache = null
    this.pageParentCache.clear()
    this.lastIndexBuildMs = null
    this.lastIndexBuildPageCount = null
  }

  getLastIndexBuildMs(): number | null {
    return this.lastIndexBuildMs
  }

  getLastIndexBuildPageCount(): number | null {
    return this.lastIndexBuildPageCount
  }

  async loadFavoriteRoots(): Promise<string[]> {
    const directFavorites = await logseq.App.getCurrentGraphFavorites()
    const configFavorites = await this.loadFavoritesFromConfigs()
    const favorites = [...normalizeFavoriteSeeds(directFavorites), ...normalizeFavoriteSeeds(configFavorites)]
    const allPages = await this.getAllPagesCached()
    const activePageTitleByKey = new Map<string, string>()
    for (const page of allPages) {
      if (isPageDeletedLike(page)) {
        continue
      }
      const title = pageTitle(page)
      const key = normalizeTitle(title)
      if (title && key) {
        activePageTitleByKey.set(key, title)
      }
    }
    const seen = new Set<string>()
    const resolved: string[] = []

    for (const favorite of favorites) {
      const normalizedSeed = normalizeFavoriteSeed(favorite)
      const normalized = normalizeTitle(normalizedSeed)
      if (!normalized || seen.has(normalized)) {
        continue
      }

      let title = activePageTitleByKey.get(normalized) ?? null
      if (!title) {
        try {
          const page = await logseq.Editor.getPage(normalizedSeed)
          if (page && !isPageDeletedLike(page)) {
            title = pageTitle(page)
          }
        } catch {
          title = null
        }
      }

      if (!title) {
        continue
      }

      seen.add(normalized)
      resolved.push(title)
    }

    return this.sortTitles(resolved)
  }

  async ensureChildIndex(hierarchyProperty: string): Promise<void> {
    if (this.childIndex) {
      return
    }
    if (this.childIndexPromise) {
      await this.childIndexPromise
      return
    }

    this.childIndexPromise = this.buildChildIndex(hierarchyProperty)
    await this.childIndexPromise
    this.childIndexPromise = null
  }

  getChildrenFor(title: string): string[] {
    if (!this.childIndex) {
      return []
    }
    return this.childIndex.get(normalizeTitle(title)) ?? []
  }

  collectReachableExpandableKeys(rootFavorites: string[]): string[] {
    const keys = new Set<string>()

    for (const root of rootFavorites) {
      this.collectExpandableKeysFrom(root, [], keys)
    }

    return [...keys]
  }

  findPathToPage(rootFavorites: string[], targetTitle: string): string[] | null {
    const paths = this.findPathsToPage(rootFavorites, targetTitle)
    return paths[0] ?? null
  }

  findPathsToPage(rootFavorites: string[], targetTitle: string): string[][] {
    const targetKey = normalizeTitle(targetTitle)
    if (!targetKey) {
      return []
    }

    const matches: string[][] = []
    for (const root of rootFavorites) {
      this.collectPathsFromNode(root, targetKey, [], matches)
    }

    return matches
  }

  async getAllPagesCached(): Promise<PageEntity[]> {
    const now = Date.now()
    const cached = this.allPageCache
    if (cached && now - cached.at < 1500) {
      return cached.pages
    }

    const pages = (await logseq.Editor.getAllPages()) ?? []
    this.allPageCache = { at: now, pages }
    return pages
  }

  private async loadFavoritesFromConfigs(): Promise<unknown> {
    try {
      return (
        (await logseq.App.getCurrentGraphConfigs('favorites', ':favorites', 'ui/favorites', ':ui/favorites')) ?? null
      )
    } catch {
      return null
    }
  }

  private async buildChildIndex(propertyName: string): Promise<void> {
    const startedAt = performance.now()
    const allPages = await this.getAllPagesCached()
    this.lastIndexBuildPageCount = allPages.length
    const index = new Map<string, string[]>()
    const existingPageKeys = new Set<string>()
    for (const page of allPages) {
      if (isPageDeletedLike(page)) {
        continue
      }
      const key = normalizeTitle(pageTitle(page))
      if (key) {
        existingPageKeys.add(key)
      }
    }

    for (const page of allPages) {
      if (isPageDeletedLike(page)) {
        continue
      }
      const title = pageTitle(page)
      if (!title) {
        continue
      }

      for (const parentTitle of await this.resolveParentTitles(page, propertyName)) {
        const normalizedParentTitle = parentTitle.trim()
        if (!normalizedParentTitle) {
          continue
        }

        const parentKey = normalizeTitle(normalizedParentTitle)
        if (!parentKey || !existingPageKeys.has(parentKey)) {
          continue
        }

        const existing = index.get(parentKey) ?? []
        if (!existing.includes(title)) {
          existing.push(title)
          index.set(parentKey, existing)
        }
      }
    }

    for (const [key, children] of index.entries()) {
      index.set(key, this.sortTitles(children))
    }

    this.childIndex = index
    this.lastIndexBuildMs = Math.max(0, Math.round(performance.now() - startedAt))
  }

  private sortTitles(titles: string[]): string[] {
    return [...titles].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { sensitivity: 'base' }))
  }

  private async resolveParentTitles(page: PageEntity, propertyName: string): Promise<string[]> {
    const pageId = page.uuid || String(page.id || '')
    const updatedAt = page.updatedAt || 0
    const cacheKey = `${pageId}:${propertyName}`

    if (pageId) {
      const cached = this.pageParentCache.get(cacheKey)
      if (cached && cached.updatedAt === updatedAt) {
        return cached.parentTitles
      }
    }

    const properties =
      page.properties && typeof page.properties === 'object'
        ? (page.properties as Record<string, unknown>)
        : null

    const targetProps = Array.from(new Set([propertyName, 'tags', 'page tags', 'page-tags'])).filter(Boolean)
    const allValues: unknown[] = []

    let hasPropertyValue = false
    if (properties) {
      for (const propName of targetProps) {
        const val = findPropertyValue(properties, propName)
        if (val != null) {
          allValues.push(val)
          hasPropertyValue = true
        }
      }
    }

    for (const propName of targetProps) {
      const rawFromTopLevel = (page as Record<string, unknown>)[propName]
      if (rawFromTopLevel != null) {
        allValues.push(rawFromTopLevel)
        hasPropertyValue = true
      }
    }

    if (!hasPropertyValue && page.uuid) {
      try {
        let fetchedProps: Record<string, unknown> | null = null
        if (typeof logseq.Editor.getPageProperties === 'function') {
          fetchedProps = (await logseq.Editor.getPageProperties(page.uuid)) as Record<string, unknown> | null
        }
        if (!fetchedProps && typeof logseq.Editor.getBlockProperties === 'function') {
          fetchedProps = (await logseq.Editor.getBlockProperties(page.uuid)) as Record<string, unknown> | null
        }
        if (fetchedProps) {
          for (const propName of targetProps) {
            const val = findPropertyValue(fetchedProps, propName)
            if (val != null) {
              allValues.push(val)
            }
          }
        }
      } catch {
        // Ignored
      }
    }

    const parentTitles = uniqueTitlesFromValues(allValues)
    if (pageId) {
      this.pageParentCache.set(cacheKey, { updatedAt, parentTitles })
    }
    return parentTitles
  }

  private collectExpandableKeysFrom(title: string, ancestors: string[], output: Set<string>): void {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return
    }

    const children = this.getChildrenFor(title)
    if (!children.length) {
      return
    }

    output.add(key)
    const nextAncestors = [...ancestors, key]
    for (const child of children) {
      this.collectExpandableKeysFrom(child, nextAncestors, output)
    }
  }

  private collectPathsFromNode(title: string, targetKey: string, ancestors: string[], matches: string[][]): void {
    const key = normalizeTitle(title)
    if (!key || ancestors.includes(key)) {
      return
    }

    const nextPath = [...ancestors, title]
    if (key === targetKey) {
      matches.push(nextPath)
    }

    for (const child of this.getChildrenFor(title)) {
      this.collectPathsFromNode(child, targetKey, nextPath, matches)
    }
  }
}
