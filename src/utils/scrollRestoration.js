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
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: 'auto' })
    })
    return true
  } catch {
    return false
  }
}

export function canGoBackInApp() {
  const idx = window.history.state?.idx
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1
}
