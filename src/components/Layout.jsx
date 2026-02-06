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

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-icon">◇</span>
          جيب
        </Link>
        <nav className="nav">
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
          <Link to="/" className="nav-link">{t('nav.stores')}</Link>
          <Link to="/cart" className="nav-link nav-cart">
            {t('nav.cart')}
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav-link">{t('nav.myOrders')}</Link>
              {isAdmin && (
                <>
                  <Link to="/create-store" className="nav-link nav-owner">{t('nav.createStore')}</Link>
                  <Link to="/add-product" className="nav-link nav-owner">{t('nav.addProduct')}</Link>
                </>
              )}
              <span className="user-email" title={user?.email}>{user?.email}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>{t('nav.logOut')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">{t('nav.logIn')}</Link>
              <Link to="/register" className="btn btn-accent">{t('nav.signUp')}</Link>
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
