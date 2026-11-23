import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useScrollRestoration } from '../hooks/useScrollRestoration'
import { languageNames } from '../i18n/translations'
import { getStores } from '../api/api'
import { DEPARTMENTS, storeDisplayName } from '../utils/categoryDisplay'
import { useWishlist } from '../utils/wishlist'
import './Layout.css'

// Shop WhatsApp number in international form (e.g. 972501234567), set in Vercel; no button without it.
const WHATSAPP = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')

// Departments that will open later; shown greyed out like big online stores do.
const COMING_SOON = ['ELECTRONICS']

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
  const wishCount = useWishlist().length

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
          <Link to="/wishlist" className="nav-link" onClick={closeMenu}>♥ {t('wishlist.title')}{wishCount > 0 ? ` (${wishCount})` : ''}</Link>
          <Link to="/cart" className="nav-link nav-cart" onClick={closeMenu}>
            {t('nav.cart')}
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav-link" onClick={closeMenu}>{t('nav.myOrders')}</Link>
              {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                <Link to="/admin/orders" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.ordersAdmin')}</Link>
              )}
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
      <nav className="tabbar" aria-label={t('tabbar.label')}>
        <NavLink to="/" end className="tabbar-item"><span aria-hidden="true">⌂</span>{t('tabbar.home')}</NavLink>
        <button type="button" className="tabbar-item" onClick={() => setMenuOpen(true)}><span aria-hidden="true">☰</span>{t('tabbar.categories')}</button>
        <NavLink to="/wishlist" className="tabbar-item"><span aria-hidden="true">♡</span>{t('wishlist.title')}{wishCount > 0 && <i className="tabbar-badge">{wishCount}</i>}</NavLink>
        <NavLink to="/cart" className="tabbar-item"><span aria-hidden="true">🛍</span>{t('nav.cart')}{totalItems > 0 && <i className="tabbar-badge">{totalItems}</i>}</NavLink>
        <NavLink to={isAuthenticated ? '/orders' : '/login'} className="tabbar-item"><span aria-hidden="true">👤</span>{t('tabbar.account')}</NavLink>
      </nav>
      {WHATSAPP && (
        <a className="wa-fab" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.5 6.5 0 0 0 1.3 3.4 14.8 14.8 0 0 0 5.7 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.4z"/></svg>
        </a>
      )}
      <footer className="site-footer">
        <div className="site-footer-brand">{t('nav.appName')}</div>
        <p>{t('shop.footerTagline')}</p>
      </footer>
    </div>
  )
}
