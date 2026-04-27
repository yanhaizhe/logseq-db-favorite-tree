import type { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { findPropertyValue, normalizeFavoriteSeed, normalizeFavoriteSeeds, normalizeTitle, pageTitle, uniqueTitlesFromValues, unwrapPageRef } from './utils'

export class FavoriteTreeTreeService {
  private childIndex: Map<string, string[]> | null = null
  private childIndexPromise: Promise<void> | null = null

  hasChildIndex(): boolean {
    return this.childIndex !== null
  }

  invalidateIndex(): void {
    this.childIndex = null
    this.childIndexPromise = null
  }

  async loadFavoriteRoots(): Promise<string[]> {
    const directFavorites = await logseq.App.getCurrentGraphFavorites()
    const configFavorites = await this.loadFavoritesFromConfigs()
    const favorites = [...normalizeFavoriteSeeds(directFavorites), ...normalizeFavoriteSeeds(configFavorites)]
    const seen = new Set<string>()
    const resolved: string[] = []

    for (const favorite of favorites) {
      const normalizedSeed = normalizeFavoriteSeed(favorite)
      const normalized = normalizeTitle(normalizedSeed)
      if (!normalized || seen.has(normalized)) {
        continue
      }

      const page = await this.resolveFavoritePage(normalizedSeed)
      const title = pageTitle(page)
      if (!title) {
        continue
      }
      const titleKey = normalizeTitle(title)
      if (!titleKey || seen.has(titleKey)) {
        continue
      }

      seen.add(titleKey)
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

  private async loadFavoritesFromConfigs(): Promise<unknown> {
    try {
      return (
        (await logseq.App.getCurrentGraphConfigs('favorites', ':favorites', 'ui/favorites', ':ui/favorites')) ?? null
      )
    } catch {
      return null
    }
  }

  private async resolveFavoritePage(seed: string): Promise<PageEntity | null> {
    const direct = await logseq.Editor.getPage(seed)
    if (direct) {
      return direct
    }

    const unwrapped = unwrapPageRef(seed)
    if (unwrapped !== seed) {
      const fromRef = await logseq.Editor.getPage(unwrapped)
      if (fromRef) {
        return fromRef
      }
    }

    return null
  }

  private async buildChildIndex(propertyName: string): Promise<void> {
    const allPages = (await logseq.Editor.getAllPages()) ?? []
    const index = new Map<string, string[]>()

    for (const page of allPages) {
      const title = pageTitle(page)
      if (!title) {
        continue
      }

      for (const parentTitle of await this.resolveParentTitles(page, propertyName)) {
        const parentKey = normalizeTitle(parentTitle)
        if (!parentKey) {
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
  }

  private sortTitles(titles: string[]): string[] {
    return [...titles].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { sensitivity: 'base' }))
  }

  private async resolveParentTitles(page: PageEntity, propertyName: string): Promise<string[]> {
    const properties =
      page.properties && typeof page.properties === 'object'
        ? (page.properties as Record<string, unknown>)
        : null
    const rawFromPage = properties ? findPropertyValue(properties, propertyName) : undefined
    const rawFromTopLevel = (page as Record<string, unknown>)[propertyName]
    let rawFromApi: unknown = undefined
    let rawFromAllProps: unknown = undefined

    if (rawFromPage == null && rawFromTopLevel == null) {
      try {
        rawFromApi = await logseq.Editor.getBlockProperty(page.uuid, propertyName)
      } catch {
        rawFromApi = undefined
      }
    }

    if (rawFromPage == null && rawFromTopLevel == null && rawFromApi == null) {
      try {
        const allProps = await logseq.Editor.getBlockProperties(page.uuid)
        if (allProps && typeof allProps === 'object') {
          rawFromAllProps = findPropertyValue(allProps as Record<string, unknown>, propertyName)
        }
      } catch {
        rawFromAllProps = undefined
      }
    }

    return uniqueTitlesFromValues([rawFromPage, rawFromTopLevel, rawFromApi, rawFromAllProps])
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
