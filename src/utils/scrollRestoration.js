const PREFIX = 'jibi-scroll:'

export function scrollStorageKey(pathname, search = '') {
  return `${PREFIX}${pathname}${search}`
}

export function saveScrollPosition(pathname, search = '') {
  try {
    sessionStorage.setItem(scrollStorageKey(pathname, search), String(window.scrollY))
  } catch {
    // ignore
  }
}

export function restoreScrollPosition(pathname, search = '') {
  try {
    const raw = sessionStorage.getItem(scrollStorageKey(pathname, search))
    if (raw == null) return false
    const y = parseInt(raw, 10)
    if (Number.isNaN(y)) return false

    let attempts = 0
    const maxAttempts = 120

    const tryRestore = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      if (maxScroll >= y - 1 || attempts >= maxAttempts) {
        window.scrollTo({ top: Math.min(y, maxScroll), left: 0, behavior: 'auto' })
        return
      }
      attempts += 1
      requestAnimationFrame(tryRestore)
    }

    requestAnimationFrame(tryRestore)
    return true
  } catch {
    return false
  }
}

export function canGoBackInApp() {
  const idx = window.history.state?.idx
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1
}
