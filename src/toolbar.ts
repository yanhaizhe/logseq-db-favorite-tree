import type { FavoriteTreeI18n } from './i18n'
import toolbarIconSvg from './toolbar-icon.svg?raw'

export function registerToolbar(i18n: FavoriteTreeI18n): void {
  // Delay registration so Logseq's internal toolbar slot DOM element is
  // rendered before setupInjectedUI tries to resolve the selector target.
  // Without this, a "can not resolve selector target" error fires on first
  // install from the marketplace due to a timing race.
  setTimeout(() => {
    logseq.App.registerUIItem('toolbar', {
      key: 'favorite-tree',
      template: `
        <a class="button" data-on-click="toggleFavoriteTree" title="${i18n.t('toolbarTitle')}" aria-label="${i18n.t('toolbarTitle')}">
          ${toolbarIconSvg}
        </a>
      `,
    })
  }, 100)
}
