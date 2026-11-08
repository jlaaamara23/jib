import { useState, useEffect } from 'react'
import { Link, useNavigationType, useSearchParams } from 'react-router-dom'
import { getStores, getProducts, getStoreCategories } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { restoreScrollPosition, saveScrollPosition } from '../utils/scrollRestoration'
import { DEPARTMENTS, storeDisplayName } from '../utils/categoryDisplay'
import { hasPrice } from '../utils/weightPrice'
import './Home.css'
import { productName, allProductNames } from '../utils/productName'

const productImage = (p) =>
  p.colorVariants?.find((v) => v.imageUrls?.length > 0)?.imageUrls?.[0] || p.imageUrls?.[0] || ''

export default function Home() {
  const navigationType = useNavigationType()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim().toLowerCase()
  const { t, lang } = useLanguage()
  const { addToCart } = useCart()
  const { isAdmin, user } = useAuth()
  const canManage = isAdmin || user?.role === 'OWNER'
  const [stores, setStores] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addedProductId, setAddedProductId] = useState(null)
  const [brokenImageByProduct, setBrokenImageByProduct] = useState({})

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
        const perStore = await Promise.all(
          loadedStores.map(async (store) => {
            const [storeProducts, storeCategories] = await Promise.all([
              getProducts(store.id),
              getStoreCategories(store.id).catch(() => []),
            ])
            return {
              products: storeProducts.map((product) => ({ ...product, store })),
              categories: storeCategories.map((c) => ({ ...c, store })),
            }
          }),
        )
        // Admins also receive drafts, so they can preview the shop before publishing.
        setProducts(perStore.flatMap((s) => s.products))
        setCategories(perStore.flatMap((s) => s.categories))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadHomeData()
  }, [])

  if (loading) return <div className="page-loading">{t('home.loadingStores')}</div>
  if (error) return <div className="page-error">{t('common.error')}: {error}</div>

  const label = (c) => {
    const key = `subcategories.${c.name}`
    const v = t(key)
    return typeof v === 'string' && v !== key ? v : c.name
  }
  const productsIn = (c) => products.filter((p) => p.categoryId === c.id || categories.find((x) => x.id === p.categoryId)?.parentId === c.id)
  const leafCircles = categories
    .filter((c) => c.parentId != null)
    .map((c) => ({ c, items: productsIn(c) }))
    .filter((x) => x.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 10)
  const groupTiles = categories
    .filter((c) => c.parentId == null)
    .map((c) => ({ c, items: productsIn(c) }))
    .filter((x) => x.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 3)
  const heroImages = groupTiles.map((x) => productImage(x.items[0])).filter(Boolean).slice(0, 2)
  const departments = stores.filter((s) => DEPARTMENTS.includes(s.category))
  const firstDept = departments[0]

  const matches = (p) => !query || `${allProductNames(p)} ${p.description || ''}`.toLowerCase().includes(query)
  const feed = products.filter(matches).slice().sort((a, b) => b.id - a.id).slice(0, query ? 120 : 20)

  const handleQuickAdd = (product) => {
    addToCart({ ...product, storeId: product.store.id, storeName: storeDisplayName(product.store, t), storeCategory: product.store.category }, 1)
    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 700)
  }

  const handleProductNavigate = () => saveScrollPosition('/', '')

  const productGrid = (
    <div className="shop-grid">
      {feed.map((p) => {
        const imageUrl = productImage(p)
        const link = `/product/${p.id}?store=${encodeURIComponent(p.store.slug)}`
        const isDraft = p.status === 'DRAFT'
        return (
          <article key={p.id} className="shop-card">
            <Link to={link} className="shop-card-media" onClick={handleProductNavigate}>
              {imageUrl && !brokenImageByProduct[p.id] ? (
                <img
                  src={imageUrl}
                  alt={productName(p, lang)}
                  loading="lazy"
                  onError={() => setBrokenImageByProduct((prev) => ({ ...prev, [p.id]: true }))}
                />
              ) : (
                <div className="shop-card-placeholder">{t('storePage.noImage')}</div>
              )}
              {isDraft ? <span className="shop-tag draft">{t('shop.draft')}</span> : <span className="shop-tag">{t('shop.new')}</span>}
            </Link>
            <div className="shop-card-body">
              <Link to={link} className="shop-card-name" onClick={handleProductNavigate}>{productName(p, lang)}</Link>
              <span className="shop-card-dept">{storeDisplayName(p.store, t)}</span>
              <div className="shop-card-bottom">
                <span className="shop-card-price">{hasPrice(p) ? `₪${Number(p.price).toFixed(2)}` : t('shop.noPrice')}</span>
                {!isDraft && hasPrice(p) && (
                  <button
                    type="button"
                    className={`shop-card-add ${addedProductId === p.id ? 'is-added' : ''}`}
                    onClick={() => handleQuickAdd(p)}
                    aria-label={t('home.addToCart')}
                  >
                    {addedProductId === p.id ? '✓' : '+'}
                  </button>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )

  if (query) {
    return (
      <div className="home">
        <div className="shop-section-head">
          <h2>{t('shop.resultsFor')} “{searchParams.get('q')}”</h2>
          <span className="shop-section-count">{t('storePage.productCount').replace('{n}', feed.length)}</span>
        </div>
        {feed.length > 0 ? productGrid : <p className="empty">{t('shop.noResults')}</p>}
      </div>
    )
  }

  return (
    <div className="home">
      <section className="shop-hero">
        <div className="shop-hero-copy">
          <small>{t('shop.heroEyebrow')}</small>
          <h1>{t('shop.heroTitle')}</h1>
          <p>{t('shop.heroSubtitle')}</p>
          {firstDept && <Link to={`/store/${firstDept.slug}`} className="shop-hero-btn">{t('home.shopNow')}</Link>}
        </div>
        {heroImages.map((src) => <img key={src} src={src} alt="" className="shop-hero-img" />)}
      </section>

      {leafCircles.length > 0 && (
        <section className="shop-circles" aria-label={t('home.shopByCategory')}>
          {leafCircles.map(({ c, items }) => (
            <Link key={c.id} to={`/store/${c.store.slug}?cat=${c.id}`} className="shop-circle">
              <img src={productImage(items[0])} alt="" loading="lazy" />
              <span>{label(c)}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="shop-perks">
        <div><span aria-hidden="true">🚚</span><p><b>{t('shop.perkDelivery')}</b>{t('shop.perkDeliveryText')}</p></div>
        <div><span aria-hidden="true">↩️</span><p><b>{t('shop.perkReturns')}</b>{t('shop.perkReturnsText')}</p></div>
        <div><span aria-hidden="true">🔒</span><p><b>{t('shop.perkSecure')}</b>{t('shop.perkSecureText')}</p></div>
        <div><span aria-hidden="true">💬</span><p><b>{t('shop.perkSupport')}</b>{t('shop.perkSupportText')}</p></div>
      </section>

      {groupTiles.length > 0 && (
        <section className="shop-tiles">
          {groupTiles.map(({ c, items }) => (
            <Link key={c.id} to={`/store/${c.store.slug}?cat=${c.id}`} className="shop-tile">
              <img src={productImage(items[0])} alt="" loading="lazy" />
              <span>{label(c)}<small>{t('shop.models').replace('{n}', items.length)}</small></span>
            </Link>
          ))}
        </section>
      )}

      <div className="shop-section-head">
        <h2>{t('shop.newArrivals')}</h2>
        {firstDept && <Link to={`/store/${firstDept.slug}`}>{t('shop.seeAll')} ←</Link>}
      </div>
      {feed.length > 0 ? productGrid : (
        canManage ? (
          <div className="empty admin-empty">
            <p>{t('home.adminNoStores')}</p>
            <div className="admin-empty-actions">
              <Link to="/manage" className="btn btn-primary">{t('nav.manageProducts')}</Link>
            </div>
          </div>
        ) : (
          <p className="empty">{t('shop.comingSoon')}</p>
        )
      )}
    </div>
  )
}
