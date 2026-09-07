import type { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { isMatchingPropertyKey, DEFAULT_PAGE_TAG_PROPERTIES } from './db-change'
import {
  findPropertyValue,
  isPageDeletedLike,
  normalizeFavoriteSeed,
  normalizeFavoriteSeeds,
  normalizeTitle,
  pageTitle,
  uniqueTitlesFromValues,
} from './utils'

export class FavoriteTreeTreeService {
  private childIndex: Map<string, string[]> | null = null
  private childIndexPromise: Promise<void> | null = null
  private allPageCache: { at: number; pages: PageEntity[] } | null = null
  private lastIndexBuildMs: number | null = null
  private lastIndexBuildPageCount: number | null = null

  hasChildIndex(): boolean {
    return this.childIndex !== null
  }

  invalidateIndex(hard = false): void {
    if (hard) {
      this.childIndex = null
    }
    this.childIndexPromise = null
    this.allPageCache = null
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
      if (isPageDeletedLike(page as Record<string, unknown>)) {
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
          if (page && !isPageDeletedLike(page as Record<string, unknown>)) {
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

  async ensureChildIndex(hierarchyProperty: string, force = false): Promise<void> {
    if (this.childIndex && !force) {
      return
    }
    if (this.childIndexPromise) {
      await this.childIndexPromise
      return
    }

    this.childIndexPromise = this.buildChildIndex(hierarchyProperty)
    try {
      await this.childIndexPromise
    } finally {
      this.childIndexPromise = null
    }
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

    // 1. Fast-Path: Bulk Datascript query in single IPC trip (~15-30ms)
    try {
      const built = await this.buildChildIndexViaDatascript(propertyName)
      if (built) {
        this.lastIndexBuildMs = Math.max(0, Math.round(performance.now() - startedAt))
        return
      }
    } catch (error) {
      console.warn('[DB Favorite Tree] Datascript query failed, falling back to batch API:', error)
    }

    // 2. Fallback: Concurrency-limited batch API
    await this.buildChildIndexViaBatchApi(propertyName)
    this.lastIndexBuildMs = Math.max(0, Math.round(performance.now() - startedAt))
  }

  private async buildChildIndexViaDatascript(propertyName: string): Promise<boolean> {
    const targetProperties = Array.from(
      new Set([propertyName, ...DEFAULT_PAGE_TAG_PROPERTIES]),
    ).filter(Boolean)

    let rawResults: unknown[] | null = null
    try {
      rawResults = await logseq.DB.datascriptQuery<unknown[]>(`
        [:find (pull ?p [* {:block/tags [:db/id :block/name :block/original-name :block/title]}])
         :where
         [?p :block/name _]]
      `)
    } catch {
      try {
        rawResults = await logseq.DB.datascriptQuery<unknown[]>(`
          [:find (pull ?p [*])
           :where
           [?p :block/name _]]
        `)
      } catch {
        return false
      }
    }

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return false
    }

    const rawPages = rawResults.map((row) => (Array.isArray(row) ? row[0] : row)) as Record<string, unknown>[]
    const idToTitleMap = new Map<number, string>()
    const existingPageKeys = new Set<string>()
    const activePages: PageEntity[] = []
    const validPagesData: Array<{ title: string; page: Record<string, unknown> }> = []

    for (const page of rawPages) {
      if (!page || typeof page !== 'object' || isPageDeletedLike(page)) {
        continue
      }

      const title = this.extractTitleFromRecord(page)
      const key = normalizeTitle(title)
      if (!title || !key) {
        continue
      }

      const id = page[':db/id'] ?? page['db/id'] ?? page.id
      if (typeof id === 'number') {
        idToTitleMap.set(id, title)
      }

      existingPageKeys.add(key)
      activePages.push(page as unknown as PageEntity)
      validPagesData.push({ title, page })
    }

    this.allPageCache = { at: Date.now(), pages: activePages }
    this.lastIndexBuildPageCount = activePages.length

    const nextIndex = new Map<string, string[]>()

    for (const { title, page } of validPagesData) {
      const pageKey = normalizeTitle(title)
      const candidateValues: unknown[] = []

      // 1. Page tags: :block/tags or tags
      const rawTags = page[':block/tags'] ?? page['block/tags'] ?? page.tags
      if (rawTags != null) {
        candidateValues.push(rawTags)
      }

      // 2. Direct properties on the page record matching targetProperties
      for (const [propKey, propVal] of Object.entries(page)) {
        if (propVal != null && isMatchingPropertyKey(propKey, targetProperties)) {
          candidateValues.push(propVal)
        }
      }

      // 3. Properties map (:block/properties or properties)
      const props = (page.properties ?? page[':block/properties'] ?? page['block/properties']) as
        | Record<string, unknown>
        | undefined
      if (props && typeof props === 'object') {
        for (const propName of targetProperties) {
          const val = findPropertyValue(props, propName)
          if (val != null) {
            candidateValues.push(val)
          }
        }
      }

      // Resolve candidate values to parent titles
      const parentTitles = this.resolveValuesToTitles(candidateValues, idToTitleMap)

      for (const parentTitle of parentTitles) {
        const parentKey = normalizeTitle(parentTitle)
        if (!parentKey || !existingPageKeys.has(parentKey) || parentKey === pageKey) {
          continue
        }

        const existing = nextIndex.get(parentKey) ?? []
        if (!existing.includes(title)) {
          existing.push(title)
          nextIndex.set(parentKey, existing)
        }
      }
    }

    for (const [key, children] of nextIndex.entries()) {
      nextIndex.set(key, this.sortTitles(children))
    }

    // Atomically replace child index (double-buffering)
    this.childIndex = nextIndex
    return true
  }

  private async buildChildIndexViaBatchApi(propertyName: string): Promise<void> {
    const allPages = await this.getAllPagesCached()
    this.lastIndexBuildPageCount = allPages.length
    const nextIndex = new Map<string, string[]>()
    const existingPageKeys = new Set<string>()
    for (const page of allPages) {
      if (isPageDeletedLike(page as Record<string, unknown>)) {
        continue
      }
      const key = normalizeTitle(pageTitle(page))
      if (key) {
        existingPageKeys.add(key)
      }
    }

    // Process pages in concurrent batches of 20 to avoid sequential blocking
    const BATCH_SIZE = 20
    for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
      const batch = allPages.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (page) => {
          if (isPageDeletedLike(page as Record<string, unknown>)) {
            return
          }
          const title = pageTitle(page)
          if (!title) {
            return
          }

          const pageKey = normalizeTitle(title)
          const parentTitles = await this.resolveParentTitles(page, propertyName)
          for (const parentTitle of parentTitles) {
            const parentKey = normalizeTitle(parentTitle)
            if (!parentKey || !existingPageKeys.has(parentKey) || parentKey === pageKey) {
              continue
            }

            const existing = nextIndex.get(parentKey) ?? []
            if (!existing.includes(title)) {
              existing.push(title)
              nextIndex.set(parentKey, existing)
            }
          }
        }),
      )
    }

    for (const [key, children] of nextIndex.entries()) {
      nextIndex.set(key, this.sortTitles(children))
    }

    this.childIndex = nextIndex
  }

  private resolveValuesToTitles(values: unknown[], idToTitleMap: Map<number, string>): string[] {
    const rawStrings: unknown[] = []

    const processItem = (item: unknown): void => {
      if (item == null) {
        return
      }

      if (Array.isArray(item)) {
        for (const subItem of item) {
          processItem(subItem)
        }
        return
      }

      if (typeof item === 'number') {
        const titleFromId = idToTitleMap.get(item)
        if (titleFromId) {
          rawStrings.push(titleFromId)
        }
        return
      }

      if (typeof item === 'object') {
        const record = item as Record<string, unknown>
        const title = this.extractTitleFromRecord(record)
        if (title) {
          rawStrings.push(title)
          return
        }
        if (record.id && typeof record.id === 'number') {
          const titleFromId = idToTitleMap.get(record.id)
          if (titleFromId) {
            rawStrings.push(titleFromId)
            return
          }
        }
        if ('value' in record) {
          processItem(record.value)
          return
        }
      }

      rawStrings.push(item)
    }

    for (const val of values) {
      processItem(val)
    }

    return uniqueTitlesFromValues(rawStrings)
  }

  private extractTitleFromRecord(record: Record<string, unknown>): string | null {
    const original = record[':block/original-name'] ?? record['block/original-name'] ?? record.originalName
    if (typeof original === 'string' && original.trim()) {
      return original.trim()
    }

    const name = record[':block/name'] ?? record['block/name'] ?? record.name
    if (typeof name === 'string' && name.trim()) {
      return name.trim()
    }

    const title = record[':block/title'] ?? record['block/title'] ?? record.title
    if (typeof title === 'string' && title.trim()) {
      return title.trim()
    }
    if (Array.isArray(title)) {
      const joined = title.join('').trim()
      if (joined) {
        return joined
      }
    }

    return null
  }

  private async getAllPagesCached(): Promise<PageEntity[]> {
    const now = Date.now()
    const cached = this.allPageCache
    if (cached && now - cached.at < 2000) {
      return cached.pages
    }

    const pages = (await logseq.Editor.getAllPages()) ?? []
    this.allPageCache = { at: now, pages }
    return pages
  }

  private sortTitles(titles: string[]): string[] {
    return [...titles].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { sensitivity: 'base' }))
  }

  private async resolveParentTitles(page: PageEntity, propertyName: string): Promise<string[]> {
    let properties =
      page.properties && typeof page.properties === 'object'
        ? (page.properties as Record<string, unknown>)
        : null

    const targetProps = Array.from(new Set([propertyName, ...DEFAULT_PAGE_TAG_PROPERTIES])).filter(Boolean)
    const allValues: unknown[] = []

    if (!properties) {
      try {
        const fetched = await logseq.Editor.getBlockProperties(page.uuid)
        if (fetched && typeof fetched === 'object') {
          properties = fetched as Record<string, unknown>
        }
      } catch {
        properties = null
      }
    }

    for (const propName of targetProps) {
      const rawFromPage = properties ? findPropertyValue(properties, propName) : undefined
      const rawFromTopLevel = (page as Record<string, unknown>)[propName]
      allValues.push(rawFromPage, rawFromTopLevel)
    }

    return uniqueTitlesFromValues(allValues)
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
