import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { restoreScrollPosition, saveScrollPosition } from '../utils/scrollRestoration'

export function useScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    const { pathname, search } = location

    if (navigationType === 'POP') {
      restoreScrollPosition(pathname, search)
    } else if (navigationType === 'PUSH' && pathname !== '/') {
      window.scrollTo(0, 0)
    }

    return () => {
      saveScrollPosition(pathname, search)
    }
  }, [location.pathname, location.search, location.key, navigationType])
}
