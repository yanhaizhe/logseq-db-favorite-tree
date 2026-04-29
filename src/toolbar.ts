import type { FavoriteTreeI18n } from './i18n'
import toolbarIconSvg from './toolbar-icon.svg?raw'

export function registerToolbar(i18n: FavoriteTreeI18n): void {
  logseq.App.registerUIItem('toolbar', {
    key: 'favorite-tree',
    template: `
      <a class="button" data-on-click="toggleFavoriteTree" title="${i18n.t('toolbarTitle')}" aria-label="${i18n.t('toolbarTitle')}">
        ${toolbarIconSvg}
      </a>
    `,
  })
}
