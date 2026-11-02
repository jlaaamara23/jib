import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useScrollRestoration } from '../hooks/useScrollRestoration'
import { languageNames } from '../i18n/translations'
import { getStores } from '../api/api'
import { DEPARTMENTS, storeDisplayName } from '../utils/categoryDisplay'
import './Layout.css'

// Departments that will open later; shown greyed out like big online stores do.
const COMING_SOON = ['BEAUTY', 'ELECTRONICS']

export default function Layout() {
  useScrollRestoration()
  const { isAuthenticated, logout, user } = useAuth()
  const { totalItems } = useCart()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [departments, setDepartments] = useState([])
  const canManageStore = user?.role === 'ADMIN' || user?.role === 'OWNER'

  useEffect(() => {
    getStores()
      .then((stores) => setDepartments(
        stores
          .filter((s) => DEPARTMENTS.includes(s.category))
          .sort((a, b) => DEPARTMENTS.indexOf(a.category) - DEPARTMENTS.indexOf(b.category)),
      ))
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="layout">
      <div className="promo-bar">{t('shop.promoBar')}</div>
      <header className="header">
        <div className="header-top">
          <Link to="/" className="logo" onClick={closeMenu}>{t('nav.appName')}</Link>
          <form className="header-search" onSubmit={submitSearch} role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('shop.searchPlaceholder')}
              aria-label={t('shop.search')}
            />
            <button type="submit">{t('shop.search')}</button>
          </form>
          <div className="header-icons">
            <Link to={isAuthenticated ? '/orders' : '/login'} className="header-icon" onClick={closeMenu}>
              <span aria-hidden="true">👤</span>
              <small>{isAuthenticated ? t('shop.account') : t('nav.logIn')}</small>
            </Link>
            <Link to="/cart" className="header-icon" onClick={closeMenu}>
              <span aria-hidden="true">🛍️</span>
              <small>{t('nav.cart')}</small>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
            <button
              type="button"
              className="header-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className="header-menu-icon" />
            </button>
          </div>
        </div>
        <nav className="dept-nav" aria-label={t('shop.departments')}>
          {departments.map((d) => (
            <NavLink key={d.id} to={`/store/${d.slug}`} className={({ isActive }) => `dept-link${isActive ? ' active' : ''}`}>
              {storeDisplayName(d, t)}
            </NavLink>
          ))}
          {COMING_SOON.map((k) => (
            <span key={k} className="dept-link soon">
              {t('shop.dept' + k)}<small>{t('shop.soon')}</small>
            </span>
          ))}
        </nav>
        <div className={`nav-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={closeMenu} aria-hidden="true" />
        <nav className={`nav ${menuOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="nav-close-btn"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>
          <div className="lang-switcher">
            {Object.keys(languageNames).map((l) => (
              <button
                key={l}
                type="button"
                className={lang === l ? 'active' : ''}
                onClick={() => setLang(l)}
                title={languageNames[l]}
              >
                {languageNames[l]}
              </button>
            ))}
          </div>
          <Link to="/" className="nav-link" onClick={closeMenu}>{t('nav.stores')}</Link>
          {departments.map((d) => (
            <Link key={d.id} to={`/store/${d.slug}`} className="nav-link" onClick={closeMenu}>{storeDisplayName(d, t)}</Link>
          ))}
          <Link to="/cart" className="nav-link nav-cart" onClick={closeMenu}>
            {t('nav.cart')}
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav-link" onClick={closeMenu}>{t('nav.myOrders')}</Link>
              {canManageStore && (
                <>
                  <Link to="/create-store" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.createStore')}</Link>
                  <Link to="/add-product" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.addProduct')}</Link>
                  {user?.role === 'ADMIN' && (
                    <Link to="/manage" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.manageProducts')}</Link>
                  )}
                </>
              )}
              <span className="user-email" title={user?.email}>{user?.email}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>{t('nav.logOut')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={closeMenu}>{t('nav.logIn')}</Link>
              <Link to="/register" className="btn btn-accent" onClick={closeMenu}>{t('nav.signUp')}</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer-brand">{t('nav.appName')}</div>
        <p>{t('shop.footerTagline')}</p>
      </footer>
    </div>
  )
}
