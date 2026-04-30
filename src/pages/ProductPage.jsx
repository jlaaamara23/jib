import { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getProductById, getStoreById, getStoreBySlug, getProducts, getStores } from '../api/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { lineUnitPrice, usesWeightPricing } from '../utils/weightPrice'
import './ProductPage.css'

export default function ProductPage() {
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const storeFromQuery = searchParams.get('store') || ''
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const { isAdmin, user } = useAuth()
  const [product, setProduct] = useState(null)
  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')

  useEffect(() => {
    let cancelled = false
    const id = productId != null ? String(productId).trim() : ''
    const storeSlug = storeFromQuery.trim()

    const apply = (p, s) => {
      if (cancelled) return
      setProduct(p)
      setStore(s)
      setError(null)
      if (p.colorVariants?.length > 0) {
        setSelectedColor(p.colorVariants[0].color)
      }
    }

    const fail = (message) => {
      if (!cancelled) {
        setError(message)
        setProduct(null)
        setStore(null)
      }
    }

    async function load() {
      setLoading(true)
      setError(null)
      setProduct(null)
      setStore(null)

      if (!id) {
        fail(t('productPage.invalidLink'))
        setLoading(false)
        return
      }

      try {
        const p = await getProductById(id)
        const s = await getStoreById(p.storeId)
        apply(p, s)
        setLoading(false)
        return
      } catch {
        // continue with public list fallback (works even if GET /api/products/:id is blocked)
      }

      try {
        if (storeSlug) {
          const s = await getStoreBySlug(storeSlug)
          const products = await getProducts(s.id)
          const p = products.find((x) => String(x.id) === id)
          if (p) {
            apply(p, s)
            setLoading(false)
            return
          }
        }
      } catch {
        // continue
      }

      try {
        const stores = await getStores()
        for (const st of stores) {
          const products = await getProducts(st.id)
          const p = products.find((x) => String(x.id) === id)
          if (p) {
            apply(p, st)
            setLoading(false)
            return
          }
        }
      } catch {
        // ignore
      }

      fail(t('productPage.notFound'))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [productId, storeFromQuery, t])

  if (loading) return <div className="page-loading">{t('storePage.loading')}</div>
  if (error || !product) return <div className="page-error">{error || t('productPage.notFound')}</div>
  if (!store) return <div className="page-loading">{t('storePage.loading')}</div>

  const hasColorVariants = product.colorVariants && product.colorVariants.length > 0
  const activeVariant = hasColorVariants && selectedColor
    ? product.colorVariants.find((v) => v.color === selectedColor)
    : hasColorVariants ? product.colorVariants[0] : null
  const displayImages = activeVariant?.imageUrls?.length > 0
    ? activeVariant.imageUrls
    : (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : null)

  const handleAddToCart = () => {
    addToCart(
      { ...product, storeId: store.id, storeName: store.name, storeCategory: store.category },
      1,
      product.sizeStock?.length > 0 ? selectedSize || null : null,
      hasColorVariants ? (selectedColor || activeVariant?.color) : null,
    )
  }

  const weightStore = usesWeightPricing(store.category)
  const canViewStockNumbers = user?.role === 'ADMIN' || user?.role === 'OWNER'

  return (
    <div className="product-page">
      <Link to="/" className="product-page-back">← {t('home.title')}</Link>
      <Link to={`/store/${store.slug}`} className="product-page-store-link">
        {store.name}
      </Link>
      {isAdmin && product && (
        <Link
          to={`/store/${encodeURIComponent(store.slug)}?edit=${encodeURIComponent(String(product.id))}`}
          className="btn btn-secondary product-page-edit"
        >
          {t('productPage.editProduct')}
        </Link>
      )}

      <article className="product-page-card">
        {displayImages && displayImages.length > 0 ? (
          <div className="product-page-images">
            {displayImages.map((url, i) => (
              <img key={i} src={url} alt="" className="product-page-image" />
            ))}
          </div>
        ) : (
          <div className="product-card-image-placeholder">{t('storePage.noImage')}</div>
        )}
        {hasColorVariants && (
          <div className="product-color-swatches">
            {product.colorVariants.map((v) => (
              <button
                key={v.color}
                type="button"
                className={`color-swatch ${selectedColor === v.color ? 'active' : ''}`}
                onClick={() => setSelectedColor(v.color)}
                title={v.color}
              >
                {v.color}
              </button>
            ))}
          </div>
        )}
        <h1 className="product-page-title">{product.name}</h1>
        {product.description && <p className="product-page-desc">{product.description}</p>}
        <p className="product-page-price">
          ₪{Number(product.price).toFixed(2)}
          {weightStore && product.sizeStock?.length ? <span className="product-price-per-kg">{t('storePage.perKg')}</span> : null}
        </p>
        {weightStore && product.sizeStock?.length && selectedSize ? (
          <p className="product-page-pack-subtotal">
            {t('storePage.thisPack')}: ₪{lineUnitPrice({ ...product, storeCategory: store.category }, selectedSize).toFixed(2)}
          </p>
        ) : null}
        {product.sizeStock?.length > 0 ? (
          <p className="product-page-stock">
            {canViewStockNumbers
              ? (product.sizeStock.filter((s) => (s.quantity || 0) > 0).map((s) => `${s.size}: ${s.quantity}`).join(' · ') || t('storePage.outOfStock'))
              : t('storePage.inStock')}
          </p>
        ) : hasColorVariants && activeVariant ? (
          <p className="product-page-stock">
            {canViewStockNumbers
              ? (product.colorVariants.filter((v) => (v.quantity ?? 0) > 0).map((v) => `${v.color}: ${v.quantity}`).join(' · ') || t('storePage.outOfStock'))
              : t('storePage.inStock')}
          </p>
        ) : (
          <p className="product-page-stock">
            {product.stockQuantity > 0
              ? (canViewStockNumbers ? `${t('storePage.inStock')}: ${product.stockQuantity}` : t('storePage.inStock'))
              : t('storePage.outOfStock')}
          </p>
        )}
        <div className="product-page-actions">
          {product.sizeStock?.length > 0 ? (
            <>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="product-page-size-select"
              >
                <option value="">{weightStore ? t('storePage.weight') : t('addProduct.size')}</option>
                {product.sizeStock.filter((s) => (s.quantity || 0) > 0).map((s) => (
                  <option key={s.size} value={s.size}>
                    {canViewStockNumbers ? `${s.size} (${s.quantity})` : s.size}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedSize}
                onClick={handleAddToCart}
              >
                {t('storePage.addToCart')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={hasColorVariants ? ((activeVariant?.quantity ?? 0) <= 0) : (product.stockQuantity <= 0)}
              onClick={handleAddToCart}
            >
              {t('storePage.addToCart')}
            </button>
          )}
        </div>
      </article>
    </div>
  )
}
