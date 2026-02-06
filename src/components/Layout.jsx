import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { languageNames } from '../i18n/translations'
import './Layout.css'

export default function Layout() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth()
  const { totalItems } = useCart()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-icon">◇</span>
          {t('nav.appName')}
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
        <div className={`nav-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={closeMenu} aria-hidden="true" />
        <nav className={`nav ${menuOpen ? 'is-open' : ''}`}>
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
          <Link to="/cart" className="nav-link nav-cart" onClick={closeMenu}>
            {t('nav.cart')}
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav-link" onClick={closeMenu}>{t('nav.myOrders')}</Link>
              {isAdmin && (
                <>
                  <Link to="/create-store" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.createStore')}</Link>
                  <Link to="/add-product" className="nav-link nav-owner" onClick={closeMenu}>{t('nav.addProduct')}</Link>
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
    </div>
  )
}
