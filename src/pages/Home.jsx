import { useState, useEffect, useRef } from 'react'
import { Link, useNavigationType } from 'react-router-dom'
import { getStores, getProducts } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { restoreScrollPosition, saveScrollPosition } from '../utils/scrollRestoration'
import { CATEGORY_EMOJI, FEATURED_CATEGORIES, categoryEmoji } from '../utils/categoryDisplay'
import './Home.css'

export default function Home() {
  const navigationType = useNavigationType()
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const { isAdmin, user } = useAuth()
  const canManage = isAdmin || user?.role === 'OWNER'
  const [stores, setStores] = useState([])
  const [productFeed, setProductFeed] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addedProductId, setAddedProductId] = useState(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isGridAnimating, setIsGridAnimating] = useState(false)
  const [brokenImageByProduct, setBrokenImageByProduct] = useState({})
  const catalogRef = useRef(null)

  useEffect(() => {
    if (!loading && navigationType === 'POP') {
      restoreScrollPosition('/', '')
    }
  }, [loading, navigationType])

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

  useEffect(() => {
    setIsGridAnimating(true)
    const timer = window.setTimeout(() => setIsGridAnimating(false), 260)
    return () => window.clearTimeout(timer)
  }, [selectedCategory])

  if (loading) return <div className="page-loading">{t('home.loadingStores')}</div>
  if (error) return <div className="page-error">{t('common.error')}: {error}</div>

  const handleQuickAdd = (product) => {
    addToCart(product, 1)
    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 700)
  }

  const handleProductNavigate = () => {
    saveScrollPosition('/', '')
  }

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectCategory = (category) => {
    setSelectedCategory(category)
    setMobileFiltersOpen(false)
    scrollToCatalog()
  }

  const featuredToShow = FEATURED_CATEGORIES.filter(
    (cat) => categories.includes(cat) || categories.length === 0,
  )

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">{t('home.heroEyebrow')}</p>
          <h1 className="home-title">{t('home.heroTitle')}</h1>
          <p className="home-subtitle">{t('home.heroSubtitle')}</p>
          <ul className="hero-trust-list">
            <li><span aria-hidden="true">🍳</span> {t('home.trustKitchen')}</li>
            <li><span aria-hidden="true">👕</span> {t('home.trustClothing')}</li>
            <li><span aria-hidden="true">🧸</span> {t('home.trustKids')}</li>
          </ul>
          <div className="hero-ctas">
            <button type="button" className="btn btn-primary" onClick={scrollToCatalog}>
              {t('home.shopNow')}
            </button>
            <Link to="/cart" className="btn btn-secondary">
              {t('home.viewCart')}
            </Link>
          </div>
          <p className="hero-delivery-note">🚚 {t('home.homeDelivery')}</p>
        </div>

        <div className="hero-category-panel">
          <h2 className="hero-category-title">{t('home.shopByCategory')}</h2>
          <div className="hero-category-grid">
            {featuredToShow.map((category) => (
              <button
                key={category}
                type="button"
                className={`hero-category-card ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => selectCategory(category)}
              >
                <span className="hero-category-emoji" aria-hidden="true">{categoryEmoji(category)}</span>
                <span className="hero-category-name">{t('category.' + category) || category}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="home-stores" ref={catalogRef}>
        <div className="home-catalog-layout">
          <button
            type="button"
            className="mobile-filter-btn"
            onClick={() => setMobileFiltersOpen(true)}
          >
            {t('home.filterBtn')}
          </button>

          <div
            className={`sidebar-backdrop ${mobileFiltersOpen ? 'is-open' : ''}`}
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />

          <aside className={`category-sidebar ${mobileFiltersOpen ? 'is-open' : ''}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">{t('home.sidebarTitle')}</h3>
              <button
                type="button"
                className="sidebar-close"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              className={`sidebar-category-item ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => selectCategory('ALL')}
            >
              <span className="category-icon" aria-hidden="true">{CATEGORY_EMOJI.ALL}</span>
              <span className="category-label">{t('home.filterAll')}</span>
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`sidebar-category-item ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => selectCategory(category)}
              >
                <span className="category-icon" aria-hidden="true">{categoryEmoji(category)}</span>
                <span className="category-label">{t('category.' + category) || category}</span>
              </button>
            ))}
          </aside>

          <div className="catalog-main-content">
            <div className="catalog-header">
              <h2 className="section-title">
                {selectedCategory === 'ALL'
                  ? t('home.productFeed')
                  : (t('category.' + selectedCategory) || selectedCategory)}
              </h2>
              <span className="catalog-count">{visibleProducts.length}</span>
            </div>
            <div className={`product-feed-grid ${isGridAnimating ? 'is-animating' : ''}`}>
              {visibleProducts.map((product) => {
                const firstColorImage = product.colorVariants?.find((variant) => variant.imageUrls?.length > 0)?.imageUrls?.[0]
                const fallbackImage = product.imageUrls?.[0]
                const imageUrl = firstColorImage || fallbackImage || ''
                const imageBroken = brokenImageByProduct[product.id]
                return (
                  <article key={product.id} className="feed-card">
                    <Link to={`/product/${product.id}?store=${encodeURIComponent(product.storeSlug)}`} className="feed-card-media-link" onClick={handleProductNavigate}>
                      {imageUrl && !imageBroken ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="feed-card-image"
                          loading="lazy"
                          onError={() => setBrokenImageByProduct((prev) => ({ ...prev, [product.id]: true }))}
                        />
                      ) : (
                        <div className="feed-card-image-placeholder">{t('storePage.noImage')}</div>
                      )}
                    </Link>
                    <div className="feed-card-content">
                      <span className="feed-card-category">
                        {categoryEmoji(product.storeCategory)} {t('category.' + product.storeCategory) || product.storeCategory}
                      </span>
                      <Link to={`/product/${product.id}?store=${encodeURIComponent(product.storeSlug)}`} className="feed-card-name-link" onClick={handleProductNavigate}>
                        <h3 className="feed-card-name">{product.name}</h3>
                      </Link>
                      <p className="feed-card-store">{product.storeName}</p>
                      <p className="feed-card-price">₪{Number(product.price).toFixed(2)}</p>
                      <div className="feed-card-meta">
                        <button
                          type="button"
                          className={`quick-add-btn ${addedProductId === product.id ? 'is-added' : ''}`}
                          onClick={() => handleQuickAdd(product)}
                        >
                          {addedProductId === product.id ? t('home.added') : t('home.addToCart')}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
        {stores.length === 0 && (
          canManage ? (
            <div className="empty admin-empty">
              <p>{t('home.adminNoStores')}</p>
              <div className="admin-empty-actions">
                <Link to="/create-store" className="btn btn-primary">{t('nav.createStore')}</Link>
                <Link to="/add-product" className="btn btn-secondary">{t('nav.addProduct')}</Link>
              </div>
            </div>
          ) : (
            <p className="empty">{t('home.noStores')} <Link to="/register">{t('nav.signUp')}</Link> {t('home.signUpAsOwner')}</p>
          )
        )}
        {stores.length > 0 && visibleProducts.length === 0 && (
          <p className="empty">{t('home.noProductsForCategory')}</p>
        )}
      </section>
    </div>
  )
}
