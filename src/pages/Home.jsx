import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStores, getProducts } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import './Home.css'

const CATEGORY_ICON_LABELS = {
  ALL: 'ALL',
  CLOTHING: 'CL',
  KITCHEN: 'KT',
  BEAUTY: 'BY',
  SPICES: 'SP',
  GROCERY: 'GR',
  WOMEN_UNDERWEAR: 'WU',
  KIDS_UNDERWEAR: 'KU',
  CHILD_GAME: 'CG',
  ELECTRONICS: 'EL',
  HOME_DECOR: 'HD',
  SPORTS: 'ST',
  PETS: 'PT',
  HEALTH: 'HL',
  TOOLS: 'TL',
  OFFICE: 'OF',
}

export default function Home() {
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const [stores, setStores] = useState([])
  const [productFeed, setProductFeed] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addedProductId, setAddedProductId] = useState(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isGridAnimating, setIsGridAnimating] = useState(false)

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

  return (
    <div className="home">
      <div className="hero-particles" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="home-hero glass">
        <div className="home-hero-copy">
          <p className="eyebrow">JIBI SMART DELIVERY</p>
          <h1 className="home-title">Your world, delivered.</h1>
          <p className="home-subtitle">
            Futuristic commerce powered by intelligent drone logistics, instant routing, and seamless checkout.
          </p>
          <div className="hero-ctas">
            <button type="button" className="btn btn-gradient">
              Explore products
            </button>
            <Link to="/cart" className="btn btn-glass">
              Open cart
            </Link>
          </div>
        </div>
        <div className="drone-visual" aria-label="Drone delivery illustration">
          <div className="drone-body" />
          <div className="drone-wing wing-left" />
          <div className="drone-wing wing-right" />
          <div className="drone-light" />
          <div className="drone-shadow" />
        </div>
      </section>
      <section className="home-stores">
        <div className="home-catalog-layout">
          <button
            type="button"
            className="mobile-filter-btn"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filter
          </button>

          <div
            className={`sidebar-backdrop ${mobileFiltersOpen ? 'is-open' : ''}`}
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />

          <aside className={`category-sidebar glass ${mobileFiltersOpen ? 'is-open' : ''}`}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">Categories</h3>
              <button
                type="button"
                className="sidebar-close"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                x
              </button>
            </div>
            <div className="sidebar-divider" />
            <button
              type="button"
              className={`sidebar-category-item ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory('ALL')
                setMobileFiltersOpen(false)
              }}
            >
              <span className="category-icon">{CATEGORY_ICON_LABELS.ALL}</span>
              <span className="category-label">{t('home.filterAll')}</span>
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`sidebar-category-item ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(category)
                  setMobileFiltersOpen(false)
                }}
              >
                <span className="category-icon">{CATEGORY_ICON_LABELS[category] || 'CT'}</span>
                <span className="category-label">{t('category.' + category) || category}</span>
              </button>
            ))}
          </aside>

          <div className="catalog-main-content">
            <h2 className="section-title">{t('home.productFeed')} ({visibleProducts.length})</h2>
            <div className={`product-feed-grid ${isGridAnimating ? 'is-animating' : ''}`}>
              {visibleProducts.map((product) => {
                const firstColorImage = product.colorVariants?.find((variant) => variant.imageUrls?.length > 0)?.imageUrls?.[0]
                const fallbackImage = product.imageUrls?.[0]
                const imageUrl = firstColorImage || fallbackImage || ''
                return (
                  <article key={product.id} className="feed-card glass">
                    <Link to={`/product/${product.id}?store=${encodeURIComponent(product.storeSlug)}`} className="feed-card-media-link">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} className="feed-card-image" />
                      ) : (
                        <div className="feed-card-image-placeholder">{t('storePage.noImage')}</div>
                      )}
                    </Link>
                    <div className="feed-card-content">
                      <span className="feed-card-category">{t('category.' + product.storeCategory) || product.storeCategory}</span>
                      <Link to={`/product/${product.id}?store=${encodeURIComponent(product.storeSlug)}`} className="feed-card-name-link">
                        <h3 className="feed-card-name">{product.name}</h3>
                      </Link>
                      <p className="feed-card-price">₪{Number(product.price).toFixed(2)}</p>
                      <div className="feed-card-meta">
                        <span className="feed-speed">Drone ETA 12m</span>
                        <button
                          type="button"
                          className={`quick-add-btn ${addedProductId === product.id ? 'is-added' : ''}`}
                          onClick={() => handleQuickAdd(product)}
                        >
                          {addedProductId === product.id ? 'Added' : 'Add to cart'}
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
          <p className="empty">{t('home.noStores')} <Link to="/register">{t('nav.signUp')}</Link> {t('home.signUpAsOwner')}</p>
        )}
        {stores.length > 0 && visibleProducts.length === 0 && (
          <p className="empty">{t('home.noProductsForCategory')}</p>
        )}
      </section>
    </div>
  )
}
