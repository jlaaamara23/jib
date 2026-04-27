import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStores, getProducts } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './Home.css'

export default function Home() {
  const { t } = useLanguage()
  const [stores, setStores] = useState([])
  const [productFeed, setProductFeed] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const loadedStores = await getStores()
        setStores(loadedStores)
        const productsByStore = await Promise.all(
          loadedStores.map(async (store) => {
            const products = await getProducts(store.id)
            return products.map((product) => ({
              ...product,
              storeSlug: store.slug,
              storeName: store.name,
              storeCategory: store.category,
            }))
          }),
        )
        setProductFeed(productsByStore.flat())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadHomeData()
  }, [])

  const categories = [...new Set(stores.map((store) => store.category).filter(Boolean))]
  const visibleProducts = selectedCategory === 'ALL'
    ? productFeed
    : productFeed.filter((product) => product.storeCategory === selectedCategory)

  if (loading) return <div className="page-loading">{t('home.loadingStores')}</div>
  if (error) return <div className="page-error">{t('common.error')}: {error}</div>

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-title">{t('home.title')}</h1>
        <p className="home-subtitle">{t('home.subtitle')}</p>
      </section>
      <section className="home-stores">
        <h2 className="section-title">{t('home.productFeed')}</h2>
        <div className="category-filter" aria-label={t('home.filterByCategory')}>
          <button
            type="button"
            className={`category-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            {t('home.filterAll')}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {t('category.' + category) || category}
            </button>
          ))}
        </div>
        <div className="product-feed-grid">
          {visibleProducts.map((product) => {
            const firstColorImage = product.colorVariants?.find((variant) => variant.imageUrls?.length > 0)?.imageUrls?.[0]
            const fallbackImage = product.imageUrls?.[0]
            const imageUrl = firstColorImage || fallbackImage || ''
            return (
              <Link
                key={product.id}
                to={`/product/${product.id}?store=${encodeURIComponent(product.storeSlug)}`}
                className="feed-card"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={product.name} className="feed-card-image" />
                ) : (
                  <div className="feed-card-image-placeholder">{t('storePage.noImage')}</div>
                )}
                <div className="feed-card-content">
                  <span className="feed-card-category">{t('category.' + product.storeCategory) || product.storeCategory}</span>
                  <h3 className="feed-card-name">{product.name}</h3>
                  <p className="feed-card-price">₪{Number(product.price).toFixed(2)}</p>
                </div>
              </Link>
            )
          })}
        </div>
        {stores.length === 0 && (
          <p className="empty">{t('home.noStores')} <Link to="/register">{t('nav.signUp')}</Link> {t('home.signUpAsOwner')}</p>
        )}
        {stores.length > 0 && visibleProducts.length === 0 && (
          <p className="empty">{t('home.noProductsForCategory')}</p>
        )}
      </section>
    </div>
  )
}
