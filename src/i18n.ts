export type AppLanguage =
  | 'af'
  | 'de'
  | 'el'
  | 'en'
  | 'es'
  | 'fr'
  | 'it'
  | 'ja'
  | 'ko'
  | 'nb-NO'
  | 'nl'
  | 'pl'
  | 'pt-BR'
  | 'pt-PT'
  | 'ru'
  | 'sk'
  | 'tr'
  | 'uk'
  | 'zh-CN'
  | 'zh-Hant'

type TranslationParams = Record<string, number | string>
type TranslationValue = string | ((params: TranslationParams) => string)

type Messages = {
  toolbarTitle: TranslationValue
  settingsHierarchyTitle: TranslationValue
  settingsHierarchyDescription: TranslationValue
  settingsPanelWidthTitle: TranslationValue
  settingsPanelWidthDescription: TranslationValue
  settingsPollIntervalTitle: TranslationValue
  settingsPollIntervalDescription: TranslationValue
  settingsSidebarPositionTitle: TranslationValue
  settingsSidebarPositionDescription: TranslationValue
  settingsDisplayModePreferenceTitle: TranslationValue
  settingsDisplayModePreferenceDescription: TranslationValue
  mountPointMissing: TranslationValue
  startupFailed: TranslationValue
  bubbleExpandTitle: TranslationValue
  bubbleExpandAria: TranslationValue
  resumeAutoRefresh: TranslationValue
  pauseAutoRefresh: TranslationValue
  autoRefreshPaused: TranslationValue
  autoRefreshEverySeconds: TranslationValue
  collapseLabel: TranslationValue
  expandLabel: TranslationValue
  collapseAllTitle: TranslationValue
  expandAllTitle: TranslationValue
  expandControlsTitle: TranslationValue
  collapseControlsTitle: TranslationValue
  infoTooltip: TranslationValue
  searchPlaceholder: TranslationValue
  locateLabel: TranslationValue
  locateTitle: TranslationValue
  focusCurrentPathLabel: TranslationValue
  focusCurrentPathTitle: TranslationValue
  collapseOtherBranchesLabel: TranslationValue
  collapseOtherBranchesTitle: TranslationValue
  resetPanelSizeLabel: TranslationValue
  resetPanelSizeTitle: TranslationValue
  autoRefreshLabel: TranslationValue
  searchIndexing: TranslationValue
  loadingFavorites: TranslationValue
  noMatches: TranslationValue
  noMatchesTitle: TranslationValue
  noMatchesHint: TranslationValue
  noFavorites: TranslationValue
  noFavoritesTitle: TranslationValue
  noFavoritesHint: TranslationValue
  noHierarchyTitle: TranslationValue
  noHierarchyBody: TranslationValue
  noHierarchyHint: TranslationValue
  panelHeaderTitle: TranslationValue
  panelTitle: TranslationValue
  panelInfoAria: TranslationValue
  manualRefresh: TranslationValue
  collapseToBubble: TranslationValue
  openSettings: TranslationValue
  hidePlugin: TranslationValue
  switchToSidebar: TranslationValue
  switchToFloating: TranslationValue
  refreshing: TranslationValue
  rootCount: TranslationValue
  resizePanel: TranslationValue
  dragSort: TranslationValue
  sortModeDefaultLabel: TranslationValue
  sortModeCustomLabel: TranslationValue
  sortSwitchToDefault: TranslationValue
  sortSwitchToCustom: TranslationValue
  clearCustomSort: TranslationValue
  clearCustomSortConfirm: TranslationValue
  sortStateCustomActive: TranslationValue
  sortStateCustomSaved: TranslationValue
  toggleNode: TranslationValue
  openPage: TranslationValue
  openInRightSidebar: TranslationValue
  openInRightSidebarFailed: TranslationValue
  badgeCurrent: TranslationValue
  badgeLocated: TranslationValue
  badgeMatch: TranslationValue
  badgeCycle: TranslationValue
  cycleHint: TranslationValue
  loadingChildren: TranslationValue
  loadChildrenFailed: TranslationValue
  searchFailedTitle: TranslationValue
  searchFailedBody: TranslationValue
  searchFailedHint: TranslationValue
  noDirectChildren: TranslationValue
  currentPageNotInTree: TranslationValue
  notRefreshedYet: TranslationValue
  locateNoCurrentPage: TranslationValue
  locatePageNotInTree: TranslationValue
  refreshFailed: TranslationValue
  refreshFailedTitle: TranslationValue
  refreshFailedHint: TranslationValue
  refreshToastFailed: TranslationValue
  refreshReasonStartup: TranslationValue
  refreshReasonPanelOpen: TranslationValue
  refreshReasonBubbleOpen: TranslationValue
  refreshReasonBubbleExpand: TranslationValue
  refreshReasonManual: TranslationValue
  refreshReasonPoll: TranslationValue
  refreshReasonDbChanged: TranslationValue
  refreshReasonGraphChanged: TranslationValue
  refreshReasonSettingsProperty: TranslationValue
  refreshReasonDefault: TranslationValue
}

export type MessageKey = keyof Messages

export type FavoriteTreeI18n = {
  language: AppLanguage
  t: (key: MessageKey, params?: TranslationParams) => string
  formatClock: (date: Date) => string
}

const messages: Record<AppLanguage, Partial<Messages>> = {
  en: {
    toolbarTitle: 'DB Favorite Tree',
    settingsHierarchyTitle: 'Hierarchy Property',
    settingsHierarchyDescription:
      'Property name used to declare the parent page. The default is parent. Both single and multi-value references are supported.',
    settingsPanelWidthTitle: 'Panel Width',
    settingsPanelWidthDescription: 'Default width of the floating panel in pixels.',
    settingsPollIntervalTitle: 'Auto Refresh Interval (Seconds)',
    settingsPollIntervalDescription: 'Polling interval for automatic refresh, in seconds.',
    settingsSidebarPositionTitle: 'Initial Side Preference',
    settingsSidebarPositionDescription:
      'Choose whether the panel prefers the left or right side on first display. Remembered drag positions take priority afterward.',
    settingsDisplayModePreferenceTitle: 'Display Mode Preset',
    settingsDisplayModePreferenceDescription:
      'Choose the default behavior: sidebar = native sidebar only, floating = floating panel only, mixed = both and can switch.',
    mountPointMissing: 'Plugin mount point is missing.',
    startupFailed: ({ message }) => `DB Favorite Tree failed to start: ${message}`,
    bubbleExpandTitle: 'Click to open the favorite tree, drag to move',
    bubbleExpandAria: 'Open favorite tree',
    resumeAutoRefresh: 'Resume auto refresh',
    pauseAutoRefresh: 'Pause auto refresh',
    autoRefreshPaused: 'Auto refresh paused',
    autoRefreshEverySeconds: ({ seconds }) => `Auto refresh ${seconds}s`,
    collapseLabel: 'Collapse',
    expandLabel: 'Expand',
    collapseAllTitle: 'Collapse all expanded branches',
    expandAllTitle: 'Expand all matched branches',
    expandControlsTitle: 'Expand controls',
    collapseControlsTitle: 'Collapse controls',
    infoTooltip: ({ property }) =>
      `Drag the header to move, double-click to collapse into a bubble; hierarchy property: ${property}`,
    searchPlaceholder: 'Search page titles',
    locateLabel: 'Find current',
    locateTitle: 'Expand the current page path and scroll to the current page',
    focusCurrentPathLabel: 'Focus path',
    focusCurrentPathTitle: 'Keep only the current page path expanded and scroll to it',
    collapseOtherBranchesLabel: 'Collapse others',
    collapseOtherBranchesTitle: 'Collapse all branches outside the current page path',
    resetPanelSizeLabel: 'Default size',
    resetPanelSizeTitle: 'Restore the default panel size',
    autoRefreshLabel: 'Auto refresh',
    searchIndexing: 'Building search index...',
    loadingFavorites: 'Loading favorite tree...',
    noMatches: 'No matching pages. Try a shorter keyword.',
    noMatchesTitle: 'No search results',
    noMatchesHint: 'Try a shorter keyword, check spelling, or refresh after the graph updates.',
    noFavorites:
      'There are no favorite pages yet. Add pages to Logseq favorites first so the plugin can use them as tree roots.',
    noFavoritesTitle: 'No favorite roots yet',
    noFavoritesHint: 'Add one or more pages to Logseq favorites, then refresh here if the list does not update immediately.',
    noHierarchyTitle: 'Favorite roots found, but no hierarchy yet',
    noHierarchyBody: ({ property }) =>
      `Favorite roots are loaded, but no child pages were found through the "${property}" property.`,
    noHierarchyHint: 'Add parent-child relations with the configured property, or change the hierarchy property in settings.',
    panelHeaderTitle: 'Drag to move, double-click to collapse into a bubble',
    panelTitle: 'Favorite Tree',
    panelInfoAria: 'Show info',
    manualRefresh: 'Refresh now',
    collapseToBubble: 'Collapse to bubble',
    openSettings: 'Open settings',
    hidePlugin: 'Hide plugin',
    switchToSidebar: 'Show in sidebar',
    switchToFloating: 'Show as floating panel',
    refreshing: 'Refreshing...',
    rootCount: ({ count }) => `${count} root${Number(count) === 1 ? '' : 's'}`,
    resizePanel: 'Drag to resize the panel',
    dragSort: 'Drag to customize order',
    sortModeDefaultLabel: 'Default',
    sortModeCustomLabel: 'Custom',
    sortSwitchToDefault: 'Switch to default order',
    sortSwitchToCustom: 'Restore custom order',
    clearCustomSort: 'Clear custom order',
    clearCustomSortConfirm: 'Clear the saved custom order for this level? This action cannot be undone.',
    sortStateCustomActive: 'Custom order active',
    sortStateCustomSaved: 'Custom order saved',
    toggleNode: 'Expand or collapse',
    openPage: ({ title }) => `Open page ${title}`,
    openInRightSidebar: ({ title }) => `Open ${title} in the right sidebar`,
    openInRightSidebarFailed: ({ title }) => `Failed to open ${title} in the right sidebar.`,
    badgeCurrent: 'Current',
    badgeLocated: 'Located',
    badgeMatch: 'Match',
    badgeCycle: 'Cycle',
    cycleHint: 'Cycle detected. Recursion stops here.',
    loadingChildren: 'Loading child pages from property relations on first expansion...',
    loadChildrenFailed: 'Failed to load child pages',
    searchFailedTitle: 'Search is temporarily unavailable',
    searchFailedBody: ({ message }) => `The tree index could not be built: ${message}`,
    searchFailedHint: 'Refresh the tree or verify the hierarchy property setting, then try the search again.',
    noDirectChildren: 'No direct child pages found.',
    currentPageNotInTree: 'The current page is not in the favorite tree',
    notRefreshedYet: 'Not refreshed yet',
    locateNoCurrentPage: 'There is no current page to locate.',
    locatePageNotInTree: 'The current page is not in the favorite tree.',
    refreshFailed: ({ message }) => `Refresh failed: ${message}`,
    refreshFailedTitle: 'Failed to load the favorite tree',
    refreshFailedHint: 'Try refreshing again. If the issue persists, check graph data and the hierarchy property setting.',
    refreshToastFailed: ({ message }) => `DB Favorite Tree refresh failed: ${message}`,
    refreshReasonStartup: 'Startup',
    refreshReasonPanelOpen: 'Panel opened',
    refreshReasonBubbleOpen: 'Bubble shown',
    refreshReasonBubbleExpand: 'Expanded from bubble',
    refreshReasonManual: 'Manual refresh',
    refreshReasonPoll: 'Polling refresh',
    refreshReasonDbChanged: 'Database changed',
    refreshReasonGraphChanged: 'Graph switched',
    refreshReasonSettingsProperty: 'Settings changed',
    refreshReasonDefault: 'Refresh',
  },
  af: {
    toolbarTitle: 'DB Gunstelingboom',
    settingsHierarchyTitle: 'Hiërargie-eienskap',
    settingsHierarchyDescription:
      'Eienskapsnaam wat die ouerbladsy aandui. Die verstek is parent. Enkel- en meerwaarde-verwysings word ondersteun.',
    settingsPanelWidthTitle: 'Paneelwydte',
    settingsPanelWidthDescription: 'Verstekwydte van die drywende paneel in pixels.',
    settingsPollIntervalTitle: 'Outo-verfris-interval (sekondes)',
    settingsPollIntervalDescription: 'Peilinterval vir outomatiese verfrissing, in sekondes.',
    settingsSidebarPositionTitle: 'Aanvanklike kantvoorkeur',
    settingsSidebarPositionDescription:
      'Kies of die paneel aanvanklik links of regs verkies. Onthoude sleep-posisies kry daarna voorkeur.',
    bubbleExpandTitle: 'Klik om die gunstelingboom oop te maak, sleep om te skuif',
    bubbleExpandAria: 'Maak gunstelingboom oop',
    resumeAutoRefresh: 'Hervat outo-verfris',
    pauseAutoRefresh: 'Pouseer outo-verfris',
    autoRefreshPaused: 'Outo-verfris is gepouseer',
    autoRefreshEverySeconds: ({ seconds }) => `Outo-verfris ${seconds}s`,
    collapseLabel: 'Vou toe',
    expandLabel: 'Vou oop',
    collapseAllTitle: 'Vou alle oop takke toe',
    expandAllTitle: 'Vou alle passende takke oop',
    expandControlsTitle: 'Wys kontroles',
    collapseControlsTitle: 'Versteek kontroles',
    searchPlaceholder: 'Soek bladsytitels',
    locateLabel: 'Vind',
    locateTitle: 'Vind die huidige bladsy',
    resetPanelSizeLabel: 'Verstekgrootte',
    resetPanelSizeTitle: 'Herstel die verstek paneelgrootte',
    autoRefreshLabel: 'Outo-verfris',
    searchIndexing: 'Bou soekindeks...',
    loadingFavorites: 'Laai gunstelingboom...',
    noMatches: 'Geen passende bladsye nie. Probeer ’n korter sleutelwoord.',
    panelTitle: 'Gunstelingboom',
    panelInfoAria: 'Wys inligting',
    manualRefresh: 'Verfris nou',
    collapseToBubble: 'Vou in tot borrel',
    openSettings: 'Maak instellings oop',
    hidePlugin: 'Versteek inprop',
    refreshing: 'Besig om te verfris...',
    rootCount: ({ count }) => `${count} wortel${Number(count) === 1 ? '' : 's'}`,
    resizePanel: 'Sleep om die paneel se grootte te verander',
    dragSort: 'Sleep om volgorde aan te pas',
    toggleNode: 'Vou oop of toe',
    badgeCurrent: 'Huidig',
    badgeLocated: 'Gevind',
    badgeMatch: 'Tref',
    badgeCycle: 'Siklus',
    cycleHint: 'Sikliese verwysing opgespoor. Rekursie stop hier.',
    loadingChildren: 'Laai kindbladsye vanaf eienskapsverhoudings met eerste oopvou...',
    loadChildrenFailed: 'Kon nie kindbladsye laai nie',
    noDirectChildren: 'Geen direkte kindbladsye gevind nie.',
    currentPageNotInTree: 'Die huidige bladsy is nie in die gunstelingboom nie',
    notRefreshedYet: 'Nog nie verfris nie',
    locateNoCurrentPage: 'Daar is geen huidige bladsy om te vind nie.',
    locatePageNotInTree: 'Die huidige bladsy is nie in die gunstelingboom nie.',
    refreshReasonStartup: 'Begin',
    refreshReasonPanelOpen: 'Paneel oopgemaak',
    refreshReasonBubbleOpen: 'Borrel gewys',
    refreshReasonBubbleExpand: 'Vanaf borrel uitgebrei',
    refreshReasonManual: 'Handmatige verfrissing',
    refreshReasonPoll: 'Peil-verfrissing',
    refreshReasonDbChanged: 'Databasis verander',
    refreshReasonGraphChanged: 'Grafiek gewissel',
    refreshReasonSettingsProperty: 'Instellings verander',
  },
  de: {
    toolbarTitle: 'DB Favoritenbaum',
    settingsHierarchyTitle: 'Hierarchie-Eigenschaft',
    settingsHierarchyDescription:
      'Eigenschaftsname zur Angabe der übergeordneten Seite. Standard ist parent. Einzel- und Mehrfachwerte werden unterstützt.',
    settingsPanelWidthTitle: 'Panelbreite',
    settingsPanelWidthDescription: 'Standardbreite des schwebenden Panels in Pixeln.',
    settingsPollIntervalTitle: 'Automatische Aktualisierung (Sekunden)',
    settingsPollIntervalDescription: 'Abfrageintervall für die automatische Aktualisierung in Sekunden.',
    settingsSidebarPositionTitle: 'Bevorzugte Startseite',
    settingsSidebarPositionDescription:
      'Legt fest, ob das Panel zunächst links oder rechts angezeigt wird. Gemerkte Positionen haben danach Vorrang.',
    bubbleExpandTitle: 'Klicken zum Öffnen des Favoritenbaums, ziehen zum Verschieben',
    bubbleExpandAria: 'Favoritenbaum öffnen',
    resumeAutoRefresh: 'Automatische Aktualisierung fortsetzen',
    pauseAutoRefresh: 'Automatische Aktualisierung pausieren',
    autoRefreshPaused: 'Automatische Aktualisierung pausiert',
    autoRefreshEverySeconds: ({ seconds }) => `Automatische Aktualisierung ${seconds}s`,
    collapseLabel: 'Einklappen',
    expandLabel: 'Ausklappen',
    collapseAllTitle: 'Alle geöffneten Zweige einklappen',
    expandAllTitle: 'Alle passenden Zweige ausklappen',
    expandControlsTitle: 'Steuerung ausklappen',
    collapseControlsTitle: 'Steuerung einklappen',
    searchPlaceholder: 'Seitentitel suchen',
    locateLabel: 'Finden',
    locateTitle: 'Aktuelle Seite finden',
    resetPanelSizeLabel: 'Standardgröße',
    resetPanelSizeTitle: 'Standardgröße des Panels wiederherstellen',
    autoRefreshLabel: 'Auto-Refresh',
    searchIndexing: 'Suchindex wird erstellt...',
    loadingFavorites: 'Favoritenbaum wird geladen...',
    noMatches: 'Keine passenden Seiten gefunden. Versuchen Sie ein kürzeres Stichwort.',
    panelTitle: 'Favoritenbaum',
    panelInfoAria: 'Info anzeigen',
    manualRefresh: 'Jetzt aktualisieren',
    collapseToBubble: 'Zu Blase minimieren',
    openSettings: 'Einstellungen öffnen',
    hidePlugin: 'Plugin ausblenden',
    refreshing: 'Wird aktualisiert...',
    rootCount: ({ count }) => `${count} Wurzel${Number(count) === 1 ? '' : 'n'}`,
    resizePanel: 'Ziehen, um die Panelgröße zu ändern',
    dragSort: 'Ziehen, um die Reihenfolge anzupassen',
    toggleNode: 'Aus- oder einklappen',
    badgeCurrent: 'Aktuell',
    badgeLocated: 'Gefunden',
    badgeMatch: 'Treffer',
    badgeCycle: 'Zyklus',
    cycleHint: 'Zyklische Referenz erkannt. Rekursion stoppt hier.',
    loadingChildren: 'Unterseiten werden beim ersten Ausklappen anhand von Eigenschaftsbeziehungen geladen...',
    loadChildrenFailed: 'Unterseiten konnten nicht geladen werden',
    noDirectChildren: 'Keine direkten Unterseiten gefunden.',
    currentPageNotInTree: 'Die aktuelle Seite befindet sich nicht im Favoritenbaum',
    notRefreshedYet: 'Noch nicht aktualisiert',
    locateNoCurrentPage: 'Es gibt keine aktuelle Seite zum Finden.',
    locatePageNotInTree: 'Die aktuelle Seite befindet sich nicht im Favoritenbaum.',
    refreshReasonStartup: 'Start',
    refreshReasonPanelOpen: 'Panel geöffnet',
    refreshReasonBubbleOpen: 'Blase angezeigt',
    refreshReasonBubbleExpand: 'Aus Blase erweitert',
    refreshReasonManual: 'Manuelle Aktualisierung',
    refreshReasonPoll: 'Intervall-Aktualisierung',
    refreshReasonDbChanged: 'Datenbank geändert',
    refreshReasonGraphChanged: 'Graph gewechselt',
    refreshReasonSettingsProperty: 'Einstellungen geändert',
  },
  el: {
    toolbarTitle: 'Δέντρο Αγαπημένων DB',
    panelTitle: 'Δέντρο Αγαπημένων',
    bubbleExpandTitle: 'Κάντε κλικ για άνοιγμα, σύρετε για μετακίνηση',
    bubbleExpandAria: 'Άνοιγμα δέντρου αγαπημένων',
    resumeAutoRefresh: 'Συνέχιση αυτόματης ανανέωσης',
    pauseAutoRefresh: 'Παύση αυτόματης ανανέωσης',
    autoRefreshPaused: 'Η αυτόματη ανανέωση έχει παύσει',
    autoRefreshEverySeconds: ({ seconds }) => `Αυτόματη ανανέωση ${seconds}s`,
    collapseLabel: 'Σύμπτυξη',
    expandLabel: 'Ανάπτυξη',
    searchPlaceholder: 'Αναζήτηση τίτλων σελίδας',
    locateLabel: 'Εντοπισμός',
    locateTitle: 'Εντοπισμός τρέχουσας σελίδας',
    resetPanelSizeLabel: 'Προεπιλεγμένο μέγεθος',
    resetPanelSizeTitle: 'Επαναφορά προεπιλεγμένου μεγέθους',
    autoRefreshLabel: 'Αυτόματη ανανέωση',
    manualRefresh: 'Ανανέωση τώρα',
    collapseToBubble: 'Σύμπτυξη σε φυσαλίδα',
    openSettings: 'Άνοιγμα ρυθμίσεων',
    hidePlugin: 'Απόκρυψη πρόσθετου',
    refreshing: 'Ανανέωση...',
    badgeCurrent: 'Τρέχουσα',
    badgeLocated: 'Εντοπίστηκε',
    badgeMatch: 'Ταίριασμα',
    badgeCycle: 'Κύκλος',
    currentPageNotInTree: 'Η τρέχουσα σελίδα δεν είναι στο δέντρο αγαπημένων',
    locateNoCurrentPage: 'Δεν υπάρχει τρέχουσα σελίδα για εντοπισμό.',
    locatePageNotInTree: 'Η τρέχουσα σελίδα δεν είναι στο δέντρο αγαπημένων.',
  },
  es: {
    toolbarTitle: 'Árbol de Favoritos DB',
    panelTitle: 'Árbol de Favoritos',
    bubbleExpandTitle: 'Haz clic para abrir el árbol de favoritos y arrastra para moverlo',
    bubbleExpandAria: 'Abrir árbol de favoritos',
    resumeAutoRefresh: 'Reanudar actualización automática',
    pauseAutoRefresh: 'Pausar actualización automática',
    autoRefreshPaused: 'Actualización automática en pausa',
    autoRefreshEverySeconds: ({ seconds }) => `Actualización automática ${seconds}s`,
    collapseLabel: 'Contraer',
    expandLabel: 'Expandir',
    searchPlaceholder: 'Buscar títulos de página',
    locateLabel: 'Ubicar',
    locateTitle: 'Ubicar la página actual',
    resetPanelSizeLabel: 'Tamaño predeterminado',
    resetPanelSizeTitle: 'Restaurar el tamaño predeterminado del panel',
    autoRefreshLabel: 'Actualización automática',
    searchIndexing: 'Creando índice de búsqueda...',
    loadingFavorites: 'Cargando árbol de favoritos...',
    noMatches: 'No hay páginas coincidentes. Prueba con una palabra más corta.',
    manualRefresh: 'Actualizar ahora',
    collapseToBubble: 'Colapsar a burbuja',
    openSettings: 'Abrir configuración',
    hidePlugin: 'Ocultar plugin',
    refreshing: 'Actualizando...',
    badgeCurrent: 'Actual',
    badgeLocated: 'Ubicada',
    badgeMatch: 'Coincide',
    badgeCycle: 'Ciclo',
    currentPageNotInTree: 'La página actual no está en el árbol de favoritos',
    locateNoCurrentPage: 'No hay una página actual para ubicar.',
    locatePageNotInTree: 'La página actual no está en el árbol de favoritos.',
  },
  fr: {
    toolbarTitle: 'Arbre des Favoris DB',
    panelTitle: 'Arbre des Favoris',
    bubbleExpandTitle: 'Cliquez pour ouvrir l’arbre des favoris, faites glisser pour déplacer',
    bubbleExpandAria: 'Ouvrir l’arbre des favoris',
    resumeAutoRefresh: 'Reprendre le rafraîchissement automatique',
    pauseAutoRefresh: 'Mettre en pause le rafraîchissement automatique',
    autoRefreshPaused: 'Rafraîchissement automatique en pause',
    autoRefreshEverySeconds: ({ seconds }) => `Rafraîchissement automatique ${seconds}s`,
    collapseLabel: 'Réduire',
    expandLabel: 'Développer',
    searchPlaceholder: 'Rechercher des titres de page',
    locateLabel: 'Localiser',
    locateTitle: 'Localiser la page actuelle',
    resetPanelSizeLabel: 'Taille par défaut',
    resetPanelSizeTitle: 'Restaurer la taille par défaut du panneau',
    autoRefreshLabel: 'Rafraîchissement auto',
    manualRefresh: 'Rafraîchir',
    collapseToBubble: 'Réduire en bulle',
    openSettings: 'Ouvrir les paramètres',
    hidePlugin: 'Masquer le plugin',
    refreshing: 'Rafraîchissement...',
    badgeCurrent: 'Actuelle',
    badgeLocated: 'Localisée',
    badgeMatch: 'Résultat',
    badgeCycle: 'Cycle',
  },
  it: {
    toolbarTitle: 'Albero Preferiti DB',
    panelTitle: 'Albero Preferiti',
    bubbleExpandTitle: 'Clic per aprire l’albero preferiti, trascina per spostare',
    bubbleExpandAria: 'Apri albero preferiti',
    resumeAutoRefresh: 'Riprendi aggiornamento automatico',
    pauseAutoRefresh: 'Metti in pausa aggiornamento automatico',
    autoRefreshPaused: 'Aggiornamento automatico in pausa',
    autoRefreshEverySeconds: ({ seconds }) => `Aggiornamento automatico ${seconds}s`,
    collapseLabel: 'Comprimi',
    expandLabel: 'Espandi',
    searchPlaceholder: 'Cerca titoli pagina',
    locateLabel: 'Individua',
    locateTitle: 'Individua la pagina corrente',
    resetPanelSizeLabel: 'Dimensione predefinita',
    resetPanelSizeTitle: 'Ripristina dimensione predefinita del pannello',
    autoRefreshLabel: 'Aggiornamento automatico',
    manualRefresh: 'Aggiorna ora',
    collapseToBubble: 'Riduci a bolla',
    openSettings: 'Apri impostazioni',
    hidePlugin: 'Nascondi plugin',
    refreshing: 'Aggiornamento...',
    badgeCurrent: 'Corrente',
    badgeLocated: 'Individuata',
    badgeMatch: 'Corrispondenza',
    badgeCycle: 'Ciclo',
  },
  ja: {
    toolbarTitle: 'DB お気に入りツリー',
    panelTitle: 'お気に入りツリー',
    bubbleExpandTitle: 'クリックでお気に入りツリーを開き、ドラッグで移動',
    bubbleExpandAria: 'お気に入りツリーを開く',
    resumeAutoRefresh: '自動更新を再開',
    pauseAutoRefresh: '自動更新を一時停止',
    autoRefreshPaused: '自動更新は一時停止中',
    autoRefreshEverySeconds: ({ seconds }) => `自動更新 ${seconds}s`,
    collapseLabel: '折りたたむ',
    expandLabel: '展開',
    searchPlaceholder: 'ページタイトルを検索',
    locateLabel: '現在地',
    locateTitle: '現在のページを表示',
    resetPanelSizeLabel: '既定サイズ',
    resetPanelSizeTitle: 'パネルサイズを既定に戻す',
    autoRefreshLabel: '自動更新',
    manualRefresh: '今すぐ更新',
    collapseToBubble: 'バブルに折りたたむ',
    openSettings: '設定を開く',
    hidePlugin: 'プラグインを隠す',
    refreshing: '更新中...',
    badgeCurrent: '現在',
    badgeLocated: '位置',
    badgeMatch: '一致',
    badgeCycle: '循環',
  },
  ko: {
    toolbarTitle: 'DB 즐겨찾기 트리',
    panelTitle: '즐겨찾기 트리',
    bubbleExpandTitle: '클릭하여 즐겨찾기 트리를 열고, 드래그하여 이동',
    bubbleExpandAria: '즐겨찾기 트리 열기',
    resumeAutoRefresh: '자동 새로고침 다시 시작',
    pauseAutoRefresh: '자동 새로고침 일시중지',
    autoRefreshPaused: '자동 새로고침이 일시중지됨',
    autoRefreshEverySeconds: ({ seconds }) => `자동 새로고침 ${seconds}s`,
    collapseLabel: '접기',
    expandLabel: '펼치기',
    searchPlaceholder: '페이지 제목 검색',
    locateLabel: '찾기',
    locateTitle: '현재 페이지 찾기',
    resetPanelSizeLabel: '기본 크기',
    resetPanelSizeTitle: '패널 기본 크기 복원',
    autoRefreshLabel: '자동 새로고침',
    manualRefresh: '지금 새로고침',
    collapseToBubble: '버블로 접기',
    openSettings: '설정 열기',
    hidePlugin: '플러그인 숨기기',
    refreshing: '새로고침 중...',
    badgeCurrent: '현재',
    badgeLocated: '위치',
    badgeMatch: '일치',
    badgeCycle: '순환',
  },
  'nb-NO': {
    toolbarTitle: 'DB Favorittre',
    panelTitle: 'Favorittre',
    bubbleExpandTitle: 'Klikk for å åpne favorittreet, dra for å flytte',
    bubbleExpandAria: 'Åpne favorittre',
    resumeAutoRefresh: 'Gjenoppta automatisk oppdatering',
    pauseAutoRefresh: 'Pause automatisk oppdatering',
    autoRefreshPaused: 'Automatisk oppdatering er pauset',
    autoRefreshEverySeconds: ({ seconds }) => `Automatisk oppdatering ${seconds}s`,
    collapseLabel: 'Skjul',
    expandLabel: 'Vis',
    searchPlaceholder: 'Søk i sidetitler',
    locateLabel: 'Finn',
    locateTitle: 'Finn gjeldende side',
    resetPanelSizeLabel: 'Standardstørrelse',
    resetPanelSizeTitle: 'Gjenopprett standard panelstørrelse',
    autoRefreshLabel: 'Auto-oppdatering',
    manualRefresh: 'Oppdater nå',
    collapseToBubble: 'Minimer til boble',
    openSettings: 'Åpne innstillinger',
    hidePlugin: 'Skjul plugin',
    refreshing: 'Oppdaterer...',
  },
  nl: {
    toolbarTitle: 'DB Favorietenboom',
    panelTitle: 'Favorietenboom',
    bubbleExpandTitle: 'Klik om de favorietenboom te openen, sleep om te verplaatsen',
    bubbleExpandAria: 'Favorietenboom openen',
    resumeAutoRefresh: 'Automatisch verversen hervatten',
    pauseAutoRefresh: 'Automatisch verversen pauzeren',
    autoRefreshPaused: 'Automatisch verversen gepauzeerd',
    autoRefreshEverySeconds: ({ seconds }) => `Automatisch verversen ${seconds}s`,
    collapseLabel: 'Inklappen',
    expandLabel: 'Uitklappen',
    searchPlaceholder: 'Zoek paginatitels',
    locateLabel: 'Zoeken',
    locateTitle: 'Huidige pagina zoeken',
    resetPanelSizeLabel: 'Standaardgrootte',
    resetPanelSizeTitle: 'Standaard paneelgrootte herstellen',
    autoRefreshLabel: 'Automatisch verversen',
    manualRefresh: 'Nu verversen',
    collapseToBubble: 'Naar bubbel inklappen',
    openSettings: 'Instellingen openen',
    hidePlugin: 'Plugin verbergen',
    refreshing: 'Verversen...',
  },
  pl: {
    toolbarTitle: 'Drzewo Ulubionych DB',
    panelTitle: 'Drzewo Ulubionych',
    bubbleExpandTitle: 'Kliknij, aby otworzyć drzewo ulubionych, przeciągnij, aby przenieść',
    bubbleExpandAria: 'Otwórz drzewo ulubionych',
    resumeAutoRefresh: 'Wznów automatyczne odświeżanie',
    pauseAutoRefresh: 'Wstrzymaj automatyczne odświeżanie',
    autoRefreshPaused: 'Automatyczne odświeżanie wstrzymane',
    autoRefreshEverySeconds: ({ seconds }) => `Automatyczne odświeżanie ${seconds}s`,
    collapseLabel: 'Zwiń',
    expandLabel: 'Rozwiń',
    searchPlaceholder: 'Szukaj tytułów stron',
    locateLabel: 'Znajdź',
    locateTitle: 'Znajdź bieżącą stronę',
    resetPanelSizeLabel: 'Domyślny rozmiar',
    resetPanelSizeTitle: 'Przywróć domyślny rozmiar panelu',
    autoRefreshLabel: 'Auto-odświeżanie',
    manualRefresh: 'Odśwież teraz',
    collapseToBubble: 'Zwiń do bąbla',
    openSettings: 'Otwórz ustawienia',
    hidePlugin: 'Ukryj wtyczkę',
    refreshing: 'Odświeżanie...',
  },
  'pt-BR': {
    toolbarTitle: 'Árvore de Favoritos DB',
    panelTitle: 'Árvore de Favoritos',
    bubbleExpandTitle: 'Clique para abrir a árvore de favoritos e arraste para mover',
    bubbleExpandAria: 'Abrir árvore de favoritos',
    resumeAutoRefresh: 'Retomar atualização automática',
    pauseAutoRefresh: 'Pausar atualização automática',
    autoRefreshPaused: 'Atualização automática pausada',
    autoRefreshEverySeconds: ({ seconds }) => `Atualização automática ${seconds}s`,
    collapseLabel: 'Recolher',
    expandLabel: 'Expandir',
    searchPlaceholder: 'Pesquisar títulos de páginas',
    locateLabel: 'Localizar',
    locateTitle: 'Localizar a página atual',
    resetPanelSizeLabel: 'Tamanho padrão',
    resetPanelSizeTitle: 'Restaurar o tamanho padrão do painel',
    autoRefreshLabel: 'Atualização automática',
    manualRefresh: 'Atualizar agora',
    collapseToBubble: 'Recolher para bolha',
    openSettings: 'Abrir configurações',
    hidePlugin: 'Ocultar plugin',
    refreshing: 'Atualizando...',
  },
  'pt-PT': {
    toolbarTitle: 'Árvore de Favoritos DB',
    panelTitle: 'Árvore de Favoritos',
    bubbleExpandTitle: 'Clique para abrir a árvore de favoritos e arraste para mover',
    bubbleExpandAria: 'Abrir árvore de favoritos',
    resumeAutoRefresh: 'Retomar atualização automática',
    pauseAutoRefresh: 'Pausar atualização automática',
    autoRefreshPaused: 'Atualização automática em pausa',
    autoRefreshEverySeconds: ({ seconds }) => `Atualização automática ${seconds}s`,
    collapseLabel: 'Recolher',
    expandLabel: 'Expandir',
    searchPlaceholder: 'Pesquisar títulos de páginas',
    locateLabel: 'Localizar',
    locateTitle: 'Localizar a página atual',
    resetPanelSizeLabel: 'Tamanho predefinido',
    resetPanelSizeTitle: 'Restaurar o tamanho predefinido do painel',
    autoRefreshLabel: 'Atualização automática',
    manualRefresh: 'Atualizar agora',
    collapseToBubble: 'Recolher para bolha',
    openSettings: 'Abrir definições',
    hidePlugin: 'Ocultar plugin',
    refreshing: 'A atualizar...',
  },
  ru: {
    toolbarTitle: 'DB Дерево Избранного',
    panelTitle: 'Дерево Избранного',
    bubbleExpandTitle: 'Нажмите, чтобы открыть дерево избранного, перетащите для перемещения',
    bubbleExpandAria: 'Открыть дерево избранного',
    resumeAutoRefresh: 'Возобновить автообновление',
    pauseAutoRefresh: 'Приостановить автообновление',
    autoRefreshPaused: 'Автообновление приостановлено',
    autoRefreshEverySeconds: ({ seconds }) => `Автообновление ${seconds}s`,
    collapseLabel: 'Свернуть',
    expandLabel: 'Развернуть',
    searchPlaceholder: 'Поиск по заголовкам страниц',
    locateLabel: 'Найти',
    locateTitle: 'Найти текущую страницу',
    resetPanelSizeLabel: 'Размер по умолчанию',
    resetPanelSizeTitle: 'Восстановить размер панели по умолчанию',
    autoRefreshLabel: 'Автообновление',
    manualRefresh: 'Обновить сейчас',
    collapseToBubble: 'Свернуть в пузырь',
    openSettings: 'Открыть настройки',
    hidePlugin: 'Скрыть плагин',
    refreshing: 'Обновление...',
  },
  sk: {
    toolbarTitle: 'DB Strom Obľúbených',
    panelTitle: 'Strom Obľúbených',
    bubbleExpandTitle: 'Kliknite pre otvorenie stromu obľúbených, potiahnite pre presun',
    bubbleExpandAria: 'Otvoriť strom obľúbených',
    resumeAutoRefresh: 'Obnoviť automatické obnovovanie',
    pauseAutoRefresh: 'Pozastaviť automatické obnovovanie',
    autoRefreshPaused: 'Automatické obnovovanie je pozastavené',
    autoRefreshEverySeconds: ({ seconds }) => `Automatické obnovovanie ${seconds}s`,
    collapseLabel: 'Zbaliť',
    expandLabel: 'Rozbaliť',
    searchPlaceholder: 'Hľadať názvy stránok',
    locateLabel: 'Nájsť',
    locateTitle: 'Nájsť aktuálnu stránku',
    resetPanelSizeLabel: 'Predvolená veľkosť',
    resetPanelSizeTitle: 'Obnoviť predvolenú veľkosť panela',
    autoRefreshLabel: 'Automatické obnovovanie',
    manualRefresh: 'Obnoviť teraz',
    collapseToBubble: 'Zbaliť do bubliny',
    openSettings: 'Otvoriť nastavenia',
    hidePlugin: 'Skryť plugin',
    refreshing: 'Obnovuje sa...',
  },
  tr: {
    toolbarTitle: 'DB Favori Ağacı',
    panelTitle: 'Favori Ağacı',
    bubbleExpandTitle: 'Favori ağacını açmak için tıklayın, taşımak için sürükleyin',
    bubbleExpandAria: 'Favori ağacını aç',
    resumeAutoRefresh: 'Otomatik yenilemeyi sürdür',
    pauseAutoRefresh: 'Otomatik yenilemeyi duraklat',
    autoRefreshPaused: 'Otomatik yenileme duraklatıldı',
    autoRefreshEverySeconds: ({ seconds }) => `Otomatik yenileme ${seconds}s`,
    collapseLabel: 'Daralt',
    expandLabel: 'Genişlet',
    searchPlaceholder: 'Sayfa başlıklarını ara',
    locateLabel: 'Bul',
    locateTitle: 'Geçerli sayfayı bul',
    resetPanelSizeLabel: 'Varsayılan boyut',
    resetPanelSizeTitle: 'Varsayılan panel boyutunu geri yükle',
    autoRefreshLabel: 'Otomatik yenileme',
    manualRefresh: 'Şimdi yenile',
    collapseToBubble: 'Balon haline küçült',
    openSettings: 'Ayarları aç',
    hidePlugin: 'Eklentiyi gizle',
    refreshing: 'Yenileniyor...',
  },
  uk: {
    toolbarTitle: 'DB Дерево Обраного',
    panelTitle: 'Дерево Обраного',
    bubbleExpandTitle: 'Натисніть, щоб відкрити дерево обраного, перетягніть для переміщення',
    bubbleExpandAria: 'Відкрити дерево обраного',
    resumeAutoRefresh: 'Відновити автооновлення',
    pauseAutoRefresh: 'Призупинити автооновлення',
    autoRefreshPaused: 'Автооновлення призупинено',
    autoRefreshEverySeconds: ({ seconds }) => `Автооновлення ${seconds}s`,
    collapseLabel: 'Згорнути',
    expandLabel: 'Розгорнути',
    searchPlaceholder: 'Пошук назв сторінок',
    locateLabel: 'Знайти',
    locateTitle: 'Знайти поточну сторінку',
    resetPanelSizeLabel: 'Типовий розмір',
    resetPanelSizeTitle: 'Відновити типовий розмір панелі',
    autoRefreshLabel: 'Автооновлення',
    manualRefresh: 'Оновити зараз',
    collapseToBubble: 'Згорнути в бульбашку',
    openSettings: 'Відкрити налаштування',
    hidePlugin: 'Сховати плагін',
    refreshing: 'Оновлення...',
  },
  'zh-CN': {
    toolbarTitle: 'DB 收藏树',
    settingsHierarchyTitle: '层级属性名',
    settingsHierarchyDescription: '用于声明父页面的属性名，默认值为 parent。属性值支持单值或多值节点。',
    settingsPanelWidthTitle: '面板宽度',
    settingsPanelWidthDescription: '收藏树展开为悬浮面板时的宽度，单位为像素。',
    settingsPollIntervalTitle: '自动刷新间隔（秒）',
    settingsPollIntervalDescription: '轮询自动刷新的时间间隔，单位为秒。',
    settingsSidebarPositionTitle: '初始侧向偏好',
    settingsSidebarPositionDescription: '首次显示时默认靠左或靠右；拖动后会优先记住当前位置。',
    settingsDisplayModePreferenceTitle: '显示模式预设',
    settingsDisplayModePreferenceDescription: '可选 sidebar、floating、mixed；默认 sidebar。sidebar 为仅原生侧边栏，floating 为仅悬浮模式，mixed 为两者可切换。',
    mountPointMissing: '插件挂载点不存在',
    startupFailed: ({ message }) => `DB Favorite Tree 启动失败: ${message}`,
    bubbleExpandTitle: '点击展开收藏夹树，拖拽可移动位置',
    bubbleExpandAria: '展开收藏夹树',
    resumeAutoRefresh: '恢复自动刷新',
    pauseAutoRefresh: '暂停自动刷新',
    autoRefreshPaused: '自动刷新已暂停',
    autoRefreshEverySeconds: ({ seconds }) => `自动刷新 ${seconds}s`,
    collapseLabel: '折叠',
    expandLabel: '展开',
    collapseAllTitle: '折叠所有已展开目录',
    expandAllTitle: '展开所有已匹配目录',
    expandControlsTitle: '展开功能区',
    collapseControlsTitle: '收起功能区',
    infoTooltip: ({ property }) => `拖动标题栏移动，双击收回为悬浮球；当前层级属性：${property}`,
    searchPlaceholder: '搜索页面标题',
    locateLabel: '找到当前页',
    locateTitle: '展开当前页路径并滚动到当前页',
    focusCurrentPathLabel: '聚焦当前路径',
    focusCurrentPathTitle: '只保留当前页路径展开，并滚动到该路径',
    collapseOtherBranchesLabel: '收起其他分支',
    collapseOtherBranchesTitle: '收起当前页路径之外的所有分支',
    resetPanelSizeLabel: '默认尺寸',
    resetPanelSizeTitle: '恢复面板默认宽高',
    autoRefreshLabel: '自动刷新',
    searchIndexing: '正在建立搜索索引...',
    loadingFavorites: '正在加载收藏树...',
    noMatches: '没有匹配的页面，试试更短的关键词。',
    noMatchesTitle: '没有搜索结果',
    noMatchesHint: '可以尝试更短的关键词、检查拼写，或在图谱更新后重新刷新。',
    noFavorites: '当前没有收藏页面。先把页面加入 Logseq 收藏夹，插件才会把它们作为树根显示。',
    noFavoritesTitle: '还没有收藏树根节点',
    noFavoritesHint: '先把一个或多个页面加入 Logseq 收藏夹；如果没有立即显示，再点一次手动刷新。',
    noHierarchyTitle: '已识别收藏根节点，但还没有层级关系',
    noHierarchyBody: ({ property }) => `当前已加载收藏根节点，但没有通过属性 “${property}” 找到任何子节点。`,
    noHierarchyHint: '请先为页面补充父子属性关系，或到设置里改成你实际使用的层级属性名。',
    panelHeaderTitle: '拖动可移动，双击可收回为悬浮球',
    panelTitle: '收藏夹树',
    panelInfoAria: '查看说明',
    manualRefresh: '手动刷新',
    collapseToBubble: '收回为悬浮球',
    openSettings: '打开设置',
    hidePlugin: '隐藏插件',
    switchToSidebar: '切到原生侧边栏',
    switchToFloating: '切回悬浮面板',
    refreshing: '刷新中...',
    rootCount: ({ count }) => `${count} 个根节点`,
    resizePanel: '拖动调整面板大小',
    dragSort: '拖动自定义排序',
    sortModeDefaultLabel: '默认排序',
    sortModeCustomLabel: '自定义排序',
    sortSwitchToDefault: '切换到默认排序',
    sortSwitchToCustom: '切回自定义排序',
    clearCustomSort: '清除自定义排序',
    clearCustomSortConfirm: '确认清除当前层的自定义排序吗？此操作不可撤销。',
    sortStateCustomActive: '自定义排序中',
    sortStateCustomSaved: '已保存自定义排序',
    toggleNode: '展开或折叠',
    openPage: ({ title }) => `打开页面 ${title}`,
    openInRightSidebar: ({ title }) => `在右侧边栏打开 ${title}`,
    openInRightSidebarFailed: ({ title }) => `无法在右侧边栏打开 ${title}。`,
    badgeCurrent: '当前页',
    badgeLocated: '定位',
    badgeMatch: '匹配',
    badgeCycle: '循环',
    cycleHint: '检测到循环引用，已停止继续向下递归。',
    loadingChildren: '首次展开时正在按属性关系加载子节点...',
    loadChildrenFailed: '子节点加载失败',
    searchFailedTitle: '搜索暂时不可用',
    searchFailedBody: ({ message }) => `搜索索引构建失败：${message}`,
    searchFailedHint: '可以先手动刷新，或检查层级属性设置后再重试搜索。',
    noDirectChildren: '未发现直接子页面。',
    currentPageNotInTree: '当前页不在收藏树中',
    notRefreshedYet: '尚未刷新',
    locateNoCurrentPage: '当前没有可定位的页面。',
    locatePageNotInTree: '当前页不在收藏树中。',
    refreshFailed: ({ message }) => `刷新失败: ${message}`,
    refreshFailedTitle: '收藏树加载失败',
    refreshFailedHint: '请先重试刷新；如果仍失败，再检查图谱数据和层级属性设置。',
    refreshToastFailed: ({ message }) => `DB Favorite Tree 刷新失败: ${message}`,
    refreshReasonStartup: '启动初始化',
    refreshReasonPanelOpen: '打开面板',
    refreshReasonBubbleOpen: '显示悬浮球',
    refreshReasonBubbleExpand: '悬浮球展开',
    refreshReasonManual: '手动刷新',
    refreshReasonPoll: '轮询刷新',
    refreshReasonDbChanged: '数据库变更',
    refreshReasonGraphChanged: '图谱切换',
    refreshReasonSettingsProperty: '设置变更',
    refreshReasonDefault: '刷新',
  },
  'zh-Hant': {
    toolbarTitle: 'DB 收藏樹',
    settingsHierarchyTitle: '層級屬性名稱',
    settingsHierarchyDescription: '用於宣告父頁面的屬性名稱，預設為 parent。屬性值支援單值或多值節點。',
    settingsPanelWidthTitle: '面板寬度',
    settingsPanelWidthDescription: '收藏樹展開為浮動面板時的寬度，單位為像素。',
    settingsPollIntervalTitle: '自動重新整理間隔（秒）',
    settingsPollIntervalDescription: '輪詢自動重新整理的時間間隔，單位為秒。',
    settingsSidebarPositionTitle: '初始側邊偏好',
    settingsSidebarPositionDescription: '首次顯示時預設靠左或靠右；拖動後會優先記住目前位置。',
    settingsDisplayModePreferenceTitle: '顯示模式預設',
    settingsDisplayModePreferenceDescription: '可選 sidebar、floating、mixed；預設 sidebar。sidebar 為僅原生側邊欄，floating 為僅浮動模式，mixed 為兩者可切換。',
    mountPointMissing: '找不到外掛掛載點',
    startupFailed: ({ message }) => `DB Favorite Tree 啟動失敗: ${message}`,
    bubbleExpandTitle: '點擊展開收藏樹，拖曳可移動位置',
    bubbleExpandAria: '展開收藏樹',
    resumeAutoRefresh: '恢復自動重新整理',
    pauseAutoRefresh: '暫停自動重新整理',
    autoRefreshPaused: '自動重新整理已暫停',
    autoRefreshEverySeconds: ({ seconds }) => `自動重新整理 ${seconds}s`,
    collapseLabel: '摺疊',
    expandLabel: '展開',
    collapseAllTitle: '摺疊所有已展開目錄',
    expandAllTitle: '展開所有已匹配目錄',
    expandControlsTitle: '展開功能區',
    collapseControlsTitle: '收起功能區',
    infoTooltip: ({ property }) => `拖曳標題列可移動，雙擊可收回為浮動球；目前層級屬性：${property}`,
    searchPlaceholder: '搜尋頁面標題',
    locateLabel: '找到目前頁',
    locateTitle: '展開目前頁路徑並捲動到目前頁',
    focusCurrentPathLabel: '聚焦目前路徑',
    focusCurrentPathTitle: '只保留目前頁路徑展開，並捲動到該路徑',
    collapseOtherBranchesLabel: '收起其他分支',
    collapseOtherBranchesTitle: '收起目前頁路徑之外的所有分支',
    resetPanelSizeLabel: '預設尺寸',
    resetPanelSizeTitle: '恢復面板預設寬高',
    autoRefreshLabel: '自動重新整理',
    searchIndexing: '正在建立搜尋索引...',
    loadingFavorites: '正在載入收藏樹...',
    noMatches: '找不到匹配頁面，試試更短的關鍵字。',
    noMatchesTitle: '沒有搜尋結果',
    noMatchesHint: '可以嘗試更短的關鍵字、檢查拼寫，或在圖譜更新後重新整理。',
    noFavorites: '目前沒有收藏頁面。請先把頁面加入 Logseq 收藏夾，外掛才會把它們作為樹根顯示。',
    noFavoritesTitle: '還沒有收藏樹根節點',
    noFavoritesHint: '先把一個或多個頁面加入 Logseq 收藏夾；如果沒有立即顯示，再點一次手動重新整理。',
    noHierarchyTitle: '已識別收藏根節點，但還沒有層級關係',
    noHierarchyBody: ({ property }) => `目前已載入收藏根節點，但沒有透過屬性「${property}」找到任何子節點。`,
    noHierarchyHint: '請先為頁面補充父子屬性關係，或到設定裡改成你實際使用的層級屬性名稱。',
    panelHeaderTitle: '拖曳可移動，雙擊可收回為浮動球',
    panelTitle: '收藏樹',
    panelInfoAria: '查看說明',
    manualRefresh: '手動重新整理',
    collapseToBubble: '收回為浮動球',
    openSettings: '開啟設定',
    hidePlugin: '隱藏外掛',
    switchToSidebar: '切到原生側邊欄',
    switchToFloating: '切回懸浮面板',
    refreshing: '重新整理中...',
    rootCount: ({ count }) => `${count} 個根節點`,
    resizePanel: '拖曳調整面板大小',
    dragSort: '拖曳自訂排序',
    sortModeDefaultLabel: '預設排序',
    sortModeCustomLabel: '自訂排序',
    sortSwitchToDefault: '切換到預設排序',
    sortSwitchToCustom: '切回自訂排序',
    clearCustomSort: '清除自訂排序',
    clearCustomSortConfirm: '確認清除目前層級的自訂排序嗎？此操作不可復原。',
    sortStateCustomActive: '自訂排序中',
    sortStateCustomSaved: '已儲存自訂排序',
    toggleNode: '展開或摺疊',
    openPage: ({ title }) => `開啟頁面 ${title}`,
    openInRightSidebar: ({ title }) => `在右側邊欄開啟 ${title}`,
    openInRightSidebarFailed: ({ title }) => `無法在右側邊欄開啟 ${title}。`,
    badgeCurrent: '目前頁',
    badgeLocated: '定位',
    badgeMatch: '匹配',
    badgeCycle: '循環',
    cycleHint: '偵測到循環引用，已停止繼續向下遞迴。',
    loadingChildren: '首次展開時正在依屬性關係載入子節點...',
    loadChildrenFailed: '子節點載入失敗',
    searchFailedTitle: '搜尋暫時不可用',
    searchFailedBody: ({ message }) => `搜尋索引建立失敗：${message}`,
    searchFailedHint: '可以先手動重新整理，或檢查層級屬性設定後再重試搜尋。',
    noDirectChildren: '未發現直接子頁面。',
    currentPageNotInTree: '目前頁面不在收藏樹中',
    notRefreshedYet: '尚未重新整理',
    locateNoCurrentPage: '目前沒有可定位的頁面。',
    locatePageNotInTree: '目前頁不在收藏樹中。',
    refreshFailed: ({ message }) => `重新整理失敗: ${message}`,
    refreshFailedTitle: '收藏樹載入失敗',
    refreshFailedHint: '請先重試重新整理；如果仍失敗，再檢查圖譜資料和層級屬性設定。',
    refreshToastFailed: ({ message }) => `DB Favorite Tree 重新整理失敗: ${message}`,
    refreshReasonStartup: '啟動初始化',
    refreshReasonPanelOpen: '開啟面板',
    refreshReasonBubbleOpen: '顯示浮動球',
    refreshReasonBubbleExpand: '浮動球展開',
    refreshReasonManual: '手動重新整理',
    refreshReasonPoll: '輪詢重新整理',
    refreshReasonDbChanged: '資料庫變更',
    refreshReasonGraphChanged: '圖譜切換',
    refreshReasonSettingsProperty: '設定變更',
    refreshReasonDefault: '重新整理',
  },
}

export async function getFavoriteTreeI18n(): Promise<FavoriteTreeI18n> {
  const language = normalizeAppLanguage(await readPreferredLanguage())
  return createFavoriteTreeI18n(language)
}

export function createFavoriteTreeI18n(language: string | null | undefined): FavoriteTreeI18n {
  const normalized = normalizeAppLanguage(language)

  return {
    language: normalized,
    t: (key, params = {}) => resolveMessage(normalized, key, params),
    formatClock: (date) =>
      new Intl.DateTimeFormat(toIntlLocale(normalized), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date),
  }
}

export function normalizeAppLanguage(language: string | null | undefined): AppLanguage {
  const normalized = typeof language === 'string' ? language.trim().toLocaleLowerCase() : ''
  if (!normalized) {
    return 'en'
  }
  if (normalized === 'zh-hant' || normalized === 'zh-tw' || normalized === 'zh-hk' || normalized === 'zh-mo') {
    return 'zh-Hant'
  }
  if (normalized.startsWith('zh')) {
    return 'zh-CN'
  }
  if (normalized === 'pt' || normalized === 'pt-br') {
    return 'pt-BR'
  }
  if (normalized === 'pt-pt') {
    return 'pt-PT'
  }
  if (normalized === 'nb' || normalized === 'nb-no' || normalized === 'no' || normalized === 'no-no') {
    return 'nb-NO'
  }
  if (normalized === 'af') return 'af'
  if (normalized === 'de') return 'de'
  if (normalized === 'el') return 'el'
  if (normalized === 'en') return 'en'
  if (normalized === 'es') return 'es'
  if (normalized === 'fr') return 'fr'
  if (normalized === 'it') return 'it'
  if (normalized === 'ja') return 'ja'
  if (normalized === 'ko') return 'ko'
  if (normalized === 'nl') return 'nl'
  if (normalized === 'pl') return 'pl'
  if (normalized === 'ru') return 'ru'
  if (normalized === 'sk') return 'sk'
  if (normalized === 'tr') return 'tr'
  if (normalized === 'uk') return 'uk'
  return 'en'
}

async function readPreferredLanguage(): Promise<string | null> {
  try {
    const configs = await logseq.App.getUserConfigs()
    if (configs && typeof configs === 'object') {
      const record = configs as Record<string, unknown>
      for (const key of ['preferredLanguage', 'preferred-language', 'preferredLang', 'locale', 'lang']) {
        const value = record[key]
        if (typeof value === 'string' && value.trim()) {
          return value.trim()
        }
      }
    }
  } catch {
    // Ignore and fall back to navigator language.
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language.trim()) {
    return navigator.language.trim()
  }

  return null
}

function resolveMessage(language: AppLanguage, key: MessageKey, params: TranslationParams): string {
  const candidate = messages[language][key] ?? messages.en[key] ?? key
  return typeof candidate === 'function' ? candidate(params) : candidate
}

function toIntlLocale(language: AppLanguage): string {
  return language
}
