import type { FavoriteTreeI18n } from './i18n'

export function registerToolbar(toggleFavoriteTree: () => Promise<void>, i18n: FavoriteTreeI18n): void {
  logseq.provideModel({
    toggleFavoriteTree,
  })

  logseq.App.registerUIItem('toolbar', {
    key: 'db-favorite-tree',
    template: `
      <a class="button" data-on-click="toggleFavoriteTree" title="${i18n.t('toolbarTitle')}" aria-label="${i18n.t('toolbarTitle')}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3.75 8A2.25 2.25 0 0 1 6 5.75h3.62l1.63 1.63c.28.28.66.44 1.06.44H18A2.25 2.25 0 0 1 20.25 10v7A2.25 2.25 0 0 1 18 19.25H6A2.25 2.25 0 0 1 3.75 17V8Z"></path>
          <path d="M12 9.75v5.25"></path>
          <path d="M12 11.25H8.75"></path>
          <path d="M12 11.25h3.25"></path>
          <path d="M12 15h-2.25"></path>
          <circle cx="8.75" cy="11.25" r="1"></circle>
          <circle cx="15.25" cy="11.25" r="1"></circle>
          <circle cx="9.75" cy="15" r="1"></circle>
          <path d="M18.5 13.8l.55 1.1 1.22.18-.89.86.21 1.21-1.09-.57-1.09.57.21-1.21-.89-.86 1.22-.18.55-1.1Z" fill="currentColor" stroke="none"></path>
        </svg>
      </a>
    `,
  })
}
