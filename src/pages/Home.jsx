import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStores } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './Home.css'

export default function Home() {
  const { t } = useLanguage()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">{t('home.loadingStores')}</div>
  if (error) return <div className="page-error">{t('common.error')}: {error}</div>

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-title">{t('home.title')}</h1>
        <p className="home-subtitle">{t('home.subtitle')}</p>
      </section>
      <section className="home-stores">
        <h2 className="section-title">{t('home.allStores')}</h2>
        <div className="store-grid">
          {stores.map((store) => (
            <Link key={store.id} to={`/store/${store.slug}`} className="store-card">
              <div className="store-card-icon-wrap">
                {store.iconUrl ? (
                  <img src={store.iconUrl} alt="" className="store-card-icon" />
                ) : (
                  <span className="store-card-icon-placeholder">◇</span>
                )}
              </div>
              <span className="store-card-category">{t('category.' + store.category) || store.category}</span>
              <h3 className="store-card-name">{store.name}</h3>
              <span className="store-card-slug">/{store.slug}</span>
            </Link>
          ))}
        </div>
        {stores.length === 0 && (
          <p className="empty">{t('home.noStores')} <Link to="/register">{t('nav.signUp')}</Link> {t('home.signUpAsOwner')}</p>
        )}
      </section>
    </div>
  )
}
