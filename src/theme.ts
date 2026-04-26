import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'

export function applyTheme(mode: ThemeMode): void {
  const fallbacks =
    mode === 'dark'
      ? {
          bg: '#111827',
          bgMuted: '#1f2937',
          border: '#374151',
          text: '#f3f4f6',
          textMuted: '#9ca3af',
          accent: '#60a5fa',
          shadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        }
      : {
          bg: '#ffffff',
          bgMuted: '#f5f7fb',
          border: '#d7dce5',
          text: '#1f2937',
          textMuted: '#6b7280',
          accent: '#2563eb',
          shadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
        }

  const lookup = (names: string[], fallback: string): string => {
    try {
      const target = window.parent?.document?.documentElement
      if (!target) {
        return fallback
      }
      const styles = window.parent.getComputedStyle(target)
      for (const name of names) {
        const value = styles.getPropertyValue(name).trim()
        if (value) {
          return value
        }
      }
    } catch {
      return fallback
    }
    return fallback
  }

  document.documentElement.style.setProperty('--ft-bg', lookup(['--ls-primary-background-color'], fallbacks.bg))
  document.documentElement.style.setProperty(
    '--ft-bg-muted',
    lookup(['--ls-secondary-background-color', '--ls-tertiary-background-color'], fallbacks.bgMuted),
  )
  document.documentElement.style.setProperty('--ft-border', lookup(['--ls-border-color'], fallbacks.border))
  document.documentElement.style.setProperty('--ft-text', lookup(['--ls-primary-text-color'], fallbacks.text))
  document.documentElement.style.setProperty(
    '--ft-text-muted',
    lookup(['--ls-secondary-text-color', '--ls-page-properties-text-color'], fallbacks.textMuted),
  )
  document.documentElement.style.setProperty(
    '--ft-accent',
    lookup(['--ls-link-text-color', '--ls-active-primary-color'], fallbacks.accent),
  )
  document.documentElement.style.setProperty('--ft-shadow', fallbacks.shadow)
}
