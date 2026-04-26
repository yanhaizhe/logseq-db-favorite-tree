export function registerToolbar(toggleFavoriteTree: () => Promise<void>): void {
  logseq.provideModel({
    toggleFavoriteTree,
  })

  logseq.App.registerUIItem('toolbar', {
    key: 'db-favorite-tree-toggle',
    template: `
      <a class="button" data-on-click="toggleFavoriteTree" title="DB Favorite Tree" aria-label="DB Favorite Tree">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <path d="M8 12h8"></path>
          <path d="M8 16h5"></path>
        </svg>
      </a>
    `,
  })
}
