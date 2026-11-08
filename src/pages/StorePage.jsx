import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams, useNavigationType } from 'react-router-dom'
import { getStoreBySlug, getProducts, getStoreCategories, updateStore, deleteStore, updateProduct, deleteProduct, uploadImage, publishProduct, unpublishProduct, publishProducts } from '../api/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { hasPrice, isSellable, lineUnitPrice, usesWeightPricing } from '../utils/weightPrice'
import { canGoBackInApp, restoreScrollPosition, saveScrollPosition } from '../utils/scrollRestoration'
import './StorePage.css'
import { STORE_CATEGORIES, storeDisplayName } from '../utils/categoryDisplay'
import { productName } from '../utils/productName'

const SIZE_OPTIONS_BY_CATEGORY = {
  SPICES: ['250G', '500G', '1KG', '2KG', '5KG'],
  GROCERY: ['250G', '500G', '1KG', '2KG', '5KG'],
  KIDS_UNDERWEAR: ['2', '4', '6', '8', '10', '12', '14'],
  SHOES: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
}

const DEFAULT_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL']

export default function StorePage() {
  const { slug } = useParams()
  const navigationType = useNavigationType()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const catParam = Number(searchParams.get('cat')) || null
  const editFromQueryHandled = useRef(false)
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categories, setCategories] = useState([])
  const [groupFilter, setGroupFilter] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [sizeFilter, setSizeFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [sortBy, setSortBy] = useState('recommended')
  const [selectedIds, setSelectedIds] = useState([])
  const [publishMessage, setPublishMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { addToCart } = useCart()

  const [editStoreOpen, setEditStoreOpen] = useState(false)
  const [editStoreName, setEditStoreName] = useState('')
  const [editStoreCategory, setEditStoreCategory] = useState('KITCHEN')
  const [editStoreIconUrl, setEditStoreIconUrl] = useState('')
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [savingStore, setSavingStore] = useState(false)

  const [editProductOpen, setEditProductOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [editProductName, setEditProductName] = useState('')
  const [editProductDesc, setEditProductDesc] = useState('')
  const [editProductPrice, setEditProductPrice] = useState('')
  const [editProductCategoryId, setEditProductCategoryId] = useState('')
  const [editProductStock, setEditProductStock] = useState('0')
  const [editProductImageUrls, setEditProductImageUrls] = useState([''])
  const [editProductSizeStocks, setEditProductSizeStocks] = useState([])
  const [editProductColorVariants, setEditProductColorVariants] = useState([])
  const [uploadingProductImage, setUploadingProductImage] = useState(null)
  const [uploadingColorEdit, setUploadingColorEdit] = useState(null)
  const editColorFileRefs = useRef({})
  const [savingProduct, setSavingProduct] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState({})
  const [selectedColors, setSelectedColors] = useState({})
  const editCategoryName = categories.find((c) => String(c.id) === String(editProductCategoryId))?.name
  const SIZE_OPTIONS = (editCategoryName === 'men_shoes' && SIZE_OPTIONS_BY_CATEGORY.SHOES)
    || SIZE_OPTIONS_BY_CATEGORY[store?.category] || DEFAULT_SIZE_OPTIONS

  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editModalError, setEditModalError] = useState('')
  const editFileInputRefs = useRef([])

  const canManage = store && user && user.role === 'ADMIN'
  const isLoggedIn = !!user
  const canViewStockNumbers = !!canManage

  const loadStore = () => {
    getStoreBySlug(slug)
      .then((s) => {
        setStore(s)
        getStoreCategories(s.id)
          .then((cats) => {
            setCategories(cats)
            // Opened from a home-page circle or tile: preselect that category.
            const picked = cats.find((c) => c.id === catParam)
            if (picked) {
              setGroupFilter(picked.parentId ?? picked.id)
              setCategoryFilter(picked.parentId != null ? picked.id : null)
            }
          })
          .catch(() => setCategories([]))
        return getProducts(s.id)
      })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setGroupFilter(null)
    setCategoryFilter(null)
    setSizeFilter('')
    setColorFilter('')
    setSortBy('recommended')
    loadStore()
  }, [slug, catParam])

  useEffect(() => {
    if (!loading && navigationType === 'POP') {
      restoreScrollPosition(`/store/${slug}`, '')
    }
  }, [loading, navigationType, slug])

  useEffect(() => {
    editFromQueryHandled.current = false
  }, [slug])

  useEffect(() => {
    if (products.length === 0) return
    setSelectedColors((prev) => {
      let next = { ...prev }
      products.forEach((p) => {
        if (p.colorVariants?.length > 0 && !next[p.id]) {
          next[p.id] = p.colorVariants[0].color
        }
      })
      return next
    })
  }, [products])

  const openEditStore = () => {
    setEditStoreName(store.name)
    setEditStoreCategory(store.category || 'KITCHEN')
    setEditStoreIconUrl(store.iconUrl || '')
    setEditStoreOpen(true)
  }

  const handleStoreIconFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIcon(true)
    try {
      const url = await uploadImage(file)
      setEditStoreIconUrl(url)
    } finally {
      setUploadingIcon(false)
      e.target.value = ''
    }
  }

  const saveStore = async (e) => {
    e.preventDefault()
    setSavingStore(true)
    try {
      const updated = await updateStore(store.id, editStoreName.trim(), editStoreCategory, editStoreIconUrl)
      setStore(updated)
      setEditStoreOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingStore(false)
    }
  }

  const handleDeleteStore = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'store') return
    try {
      await deleteStore(store.id)
      setDeleteConfirm(null)
      navigate('/')
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  const openEditProduct = (p) => {
    setEditModalError('')
    setEditProduct(p)
    setEditProductName(p.name)
    setEditProductDesc(p.description || '')
    setEditProductPrice(hasPrice(p) ? String(p.price) : '')
    setEditProductCategoryId(p.categoryId ? String(p.categoryId) : '')
    setEditProductStock(String(p.stockQuantity ?? 0))
    setEditProductImageUrls(p.imageUrls?.length ? [...p.imageUrls] : [''])
    setEditProductSizeStocks((p.sizeStock?.length ? p.sizeStock : []).map((s) => ({ size: s.size, quantity: String(s.quantity ?? 0) })))
    setEditProductColorVariants((p.colorVariants?.length ? p.colorVariants : []).map((v) => ({ color: v.color || '', imageUrls: v.imageUrls?.length ? [...v.imageUrls] : [''], quantity: v.quantity ?? '' })))
    setEditProductOpen(true)
  }

  useEffect(() => {
    if (!canManage || !store || products.length === 0) return
    const raw = searchParams.get('edit')
    if (!raw || editFromQueryHandled.current) return
    const p = products.find((x) => String(x.id) === String(raw))
    if (!p) return
    editFromQueryHandled.current = true
    openEditProduct(p)
    navigate(`/store/${encodeURIComponent(slug)}`, { replace: true })
    // openEditProduct is intentionally omitted from deps: one-shot deep-link open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, store, products, searchParams, slug, navigate])

  const setEditProductImageUrlAt = (index, value) => {
    setEditProductImageUrls((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addEditProductImageSlot = () => setEditProductImageUrls((prev) => [...prev, ''])
  const removeEditProductImageSlot = (index) => setEditProductImageUrls((prev) => prev.filter((_, i) => i !== index))

  const handleEditProductImageFile = async (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingProductImage(index)
    setEditModalError('')
    try {
      const url = await uploadImage(file)
      setEditProductImageUrlAt(index, url)
    } catch (err) {
      setEditModalError(err.message || 'Upload failed')
    } finally {
      setUploadingProductImage(null)
      e.target.value = ''
    }
  }

  const setEditSizeStockAt = (index, field, value) => {
    setEditProductSizeStocks((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }
  const addEditSizeRow = () => setEditProductSizeStocks((prev) => [...prev, { size: SIZE_OPTIONS[0], quantity: '' }])
  const removeEditSizeRow = (index) => setEditProductSizeStocks((prev) => prev.filter((_, i) => i !== index))

  const addEditColorVariant = () => setEditProductColorVariants((prev) => [...prev, { color: '', imageUrls: [''], quantity: '' }])
  const removeEditColorVariant = (ci) => setEditProductColorVariants((prev) => prev.filter((_, i) => i !== ci))
  const setEditColorVariantAt = (ci, field, value) => setEditProductColorVariants((prev) => prev.map((cv, i) => (i === ci ? { ...cv, [field]: value } : cv)))
  const setEditColorVariantImageAt = (ci, ii, value) => setEditProductColorVariants((prev) => prev.map((cv, i) => {
    if (i !== ci) return cv
    const urls = [...(cv.imageUrls || [''])]
    urls[ii] = value
    return { ...cv, imageUrls: urls }
  }))
  const addEditColorVariantImage = (ci) => setEditProductColorVariants((prev) => prev.map((cv, i) => (i === ci ? { ...cv, imageUrls: [...(cv.imageUrls || []), ''] } : cv)))
  const removeEditColorVariantImage = (ci, ii) => setEditProductColorVariants((prev) => prev.map((cv, i) => (i === ci ? { ...cv, imageUrls: (cv.imageUrls || []).filter((_, j) => j !== ii) } : cv)))
  const handleEditColorImageFile = async (ci, ii, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingColorEdit({ ci, ii })
    setEditModalError('')
    try {
      const url = await uploadImage(file)
      setEditColorVariantImageAt(ci, ii, url)
    } catch (err) {
      setEditModalError(err.message || 'Upload failed')
    } finally {
      setUploadingColorEdit(null)
      e.target.value = ''
    }
  }

  const saveProduct = async (e) => {
    e.preventDefault()
    if (!editProduct) return
    const trimmedName = editProductName.trim()
    const isDraft = editProduct.status === 'DRAFT'
    const priceEmpty = String(editProductPrice ?? '').trim() === ''
    const parsedPrice = priceEmpty ? null : Number(editProductPrice)
    if (!trimmedName) {
      setEditModalError('Please enter product name.')
      return
    }
    if (!(isDraft && priceEmpty) && (Number.isNaN(parsedPrice) || parsedPrice <= 0)) {
      setEditModalError('Please enter a valid price greater than 0.')
      return
    }
    setSavingProduct(true)
    setEditModalError('')
    try {
      const urls = editProductImageUrls.map((u) => u.trim()).filter(Boolean)
      const sizeStocksPayload = editProductSizeStocks
        .map((s) => ({ size: s.size, quantity: Math.max(0, parseInt(s.quantity, 10) || 0) }))
        .filter((s) => s.quantity > 0)
      const totalFromSizes = sizeStocksPayload.reduce((sum, s) => sum + s.quantity, 0)
      const colorVariantsPayload = editProductColorVariants
        .filter((cv) => (cv.color || '').trim())
        .map((cv) => ({
          color: (cv.color || '').trim(),
          imageUrls: (cv.imageUrls || []).map((u) => (typeof u === 'string' ? u : '').trim()).filter(Boolean),
          quantity: Math.max(0, parseInt(cv.quantity, 10) || 0),
        }))
        .filter((cv) => cv.imageUrls.length > 0)
      await updateProduct(editProduct.id, {
        storeId: store.id,
        name: trimmedName,
        description: editProductDesc.trim() || null,
        price: parsedPrice,
        stockQuantity: totalFromSizes > 0 ? totalFromSizes : Math.max(0, parseInt(editProductStock, 10) || 0),
        categoryId: editProductCategoryId ? Number(editProductCategoryId) : null,
        imageUrls: urls.length ? urls : null,
        sizeStocks: sizeStocksPayload.length > 0 ? sizeStocksPayload : null,
        colorVariants: colorVariantsPayload.length > 0 ? colorVariantsPayload : null,
      })
      setEditProductOpen(false)
      setEditProduct(null)
      loadStore()
    } catch (err) {
      setEditModalError(err.message || 'Failed to update product')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'product') return
    try {
      await deleteProduct(deleteConfirm.id)
      setDeleteConfirm(null)
      loadStore()
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  const removeProductImages = async (p) => {
    if (!p) return
    try {
      const sizeStocksPayload = (p.sizeStock || [])
        .map((s) => ({ size: s.size, quantity: Math.max(0, parseInt(s.quantity, 10) || 0) }))
        .filter((s) => s.quantity > 0)
      const totalFromSizes = sizeStocksPayload.reduce((sum, s) => sum + s.quantity, 0)
      const colorVariantsPayload = (p.colorVariants || []).map((cv) => ({
        color: (cv.color || '').trim(),
        imageUrls: [],
        quantity: Math.max(0, parseInt(cv.quantity, 10) || 0),
      })).filter((cv) => cv.color)

      await updateProduct(p.id, {
        storeId: store.id,
        name: (p.name || '').trim(),
        description: p.description || null,
        price: hasPrice(p) ? Number(p.price) : null,
        stockQuantity: totalFromSizes > 0 ? totalFromSizes : Math.max(0, parseInt(p.stockQuantity, 10) || 0),
        imageUrls: null,
        sizeStocks: sizeStocksPayload.length > 0 ? sizeStocksPayload : null,
        colorVariants: colorVariantsPayload.length > 0 ? colorVariantsPayload : null,
      })
      loadStore()
    } catch (err) {
      setError(err.message || 'Failed to remove image')
    }
  }

  const togglePublished = async (p) => {
    setPublishMessage('')
    try {
      if (p.status === 'DRAFT') await publishProduct(p.id)
      else await unpublishProduct(p.id)
      loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  const publishSelected = async () => {
    if (selectedIds.length === 0) return
    setPublishMessage('')
    try {
      const result = await publishProducts(selectedIds)
      setPublishMessage(
        t('storePage.publishResult')
          .replace('{ok}', String(result.published?.length || 0))
          .replace('{failed}', String(result.failed?.length || 0)),
      )
      setSelectedIds([])
      loadStore()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleSelected = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const categoryLabel = (c) => {
    const key = `subcategories.${c.name}`
    const label = t(key)
    return typeof label === 'string' && label !== key ? label : c.name
  }
  const statusProducts = products.filter((p) =>
    statusFilter === 'ALL' ? true : statusFilter === 'DRAFT' ? p.status === 'DRAFT' : p.status !== 'DRAFT',
  )
  // Two levels, like big online stores: top-level categories (Dresses) and their sub-categories (Evening dresses).
  const parentOf = (categoryId) => categories.find((c) => c.id === categoryId)?.parentId ?? categoryId
  const inGroup = (p, groupId) => p.categoryId === groupId || parentOf(p.categoryId) === groupId
  const topCategories = categories.filter((c) => c.parentId == null && statusProducts.some((p) => inGroup(p, c.id)))
  const groupProducts = groupFilter == null ? statusProducts : statusProducts.filter((p) => inGroup(p, groupFilter))
  // Only show sub-categories that have products the viewer can see.
  const shownCategories = groupFilter == null
    ? []
    : categories.filter((c) => c.parentId === groupFilter && groupProducts.some((p) => p.categoryId === c.id))
  const categoryProducts = categoryFilter == null ? groupProducts : groupProducts.filter((p) => p.categoryId === categoryFilter)
  const sizeOf = (p) => (p.sizeStock || []).filter((s) => (s.quantity ?? 0) > 0).map((s) => s.size)
  const colorsOf = (p) => (p.colorVariants || []).map((v) => (v.color || '').trim()).filter(Boolean)
  const sizeChoices = [...new Set(categoryProducts.flatMap(sizeOf))]
  const colorChoices = [...new Set(categoryProducts.flatMap(colorsOf))].sort((a, b) => a.localeCompare(b))
  const priceOf = (p) => (p.price == null ? null : Number(p.price))
  const visibleProducts = categoryProducts
    .filter((p) => !sizeFilter || sizeOf(p).includes(sizeFilter))
    .filter((p) => !colorFilter || colorsOf(p).includes(colorFilter))
    .slice()
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id
      if (sortBy === 'priceLow' || sortBy === 'priceHigh') {
        const pa = priceOf(a), pb = priceOf(b)
        if (pa == null) return pb == null ? 0 : 1
        if (pb == null) return -1
        return sortBy === 'priceLow' ? pa - pb : pb - pa
      }
      return 0
    })
  const selectGroup = (groupId) => {
    setGroupFilter(groupId)
    setCategoryFilter(null)
    setSizeFilter('')
    setColorFilter('')
  }
  const draftCount = products.filter((p) => p.status === 'DRAFT').length

  if (loading) return <div className="page-loading">{t('storePage.loading')}</div>
  if (error || !store) return <div className="page-error">{error || 'Store not found'}</div>

  const handleBack = (event) => {
    event.preventDefault()
    if (canGoBackInApp()) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const handleProductNavigate = () => {
    saveScrollPosition(`/store/${slug}`, '')
  }

  return (
    <div className="store-page">
      <button type="button" className="store-back" onClick={handleBack}>
        ← {t('storePage.allStores')}
      </button>
      <header className="store-header">
        <div className="store-header-icon-wrap">
          {store.iconUrl ? (
            <img src={store.iconUrl} alt="" className="store-header-icon" />
          ) : (
            <span className="store-header-icon-placeholder">◇</span>
          )}
        </div>
        <div className="store-header-text">
          <h1 className="store-page-title">{storeDisplayName(store, t)}</h1>
          <p className="store-page-slug">{t('storePage.productCount').replace('{n}', statusProducts.length)}</p>
          {canManage && (
            <div className="store-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={openEditStore}>
                {t('storePage.editStore')}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ type: 'store' })}>
                {t('storePage.deleteStore')}
              </button>
            </div>
          )}
        </div>
      </header>

      {canManage && (
        <div className="draft-toolbar">
          <div className="draft-filter" role="group">
            {['ALL', 'DRAFT', 'PUBLISHED'].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'ALL' ? t('storePage.filterAll') : f === 'DRAFT' ? `${t('storePage.filterDrafts')} (${draftCount})` : t('storePage.filterPublished')}
              </button>
            ))}
          </div>
          <div className="draft-bulk">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={draftCount === 0}
              onClick={() => setSelectedIds(products.filter((p) => p.status === 'DRAFT').map((p) => p.id))}
            >
              {t('storePage.selectDrafts')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={selectedIds.length === 0} onClick={publishSelected}>
              {t('storePage.publishSelected')} ({selectedIds.length})
            </button>
          </div>
          {publishMessage && <p className="draft-message">{publishMessage}</p>}
        </div>
      )}

      {topCategories.length > 0 && (
        <nav className="category-tabs" aria-label={t('storePage.categories')}>
          <button
            type="button"
            className={`category-tab${groupFilter == null ? ' active' : ''}`}
            onClick={() => selectGroup(null)}
          >
            {t('storePage.allSubcategories')}
          </button>
          {topCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-tab${groupFilter === c.id ? ' active' : ''}`}
              onClick={() => selectGroup(c.id)}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </nav>
      )}

      {shownCategories.length > 1 && (
        <nav className="subcategory-chips" aria-label={t('storePage.subcategories')}>
          <button
            type="button"
            className={`subcategory-chip${categoryFilter == null ? ' active' : ''}`}
            onClick={() => setCategoryFilter(null)}
          >
            {t('storePage.allSubcategories')} <span className="subcategory-count">{groupProducts.length}</span>
          </button>
          {shownCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`subcategory-chip${categoryFilter === c.id ? ' active' : ''}`}
              onClick={() => setCategoryFilter(c.id)}
            >
              {categoryLabel(c)} <span className="subcategory-count">{groupProducts.filter((p) => p.categoryId === c.id).length}</span>
            </button>
          ))}
        </nav>
      )}

      {products.length > 0 && (
        <div className="shop-toolbar">
          <span className="shop-toolbar-count">{t('storePage.productCount').replace('{n}', visibleProducts.length)}</span>
          <div className="shop-toolbar-controls">
            {sizeChoices.length > 0 && (
              <select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} aria-label={t('storePage.filterSize')}>
                <option value="">{t('storePage.filterSize')}</option>
                {sizeChoices.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {colorChoices.length > 0 && (
              <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} aria-label={t('storePage.filterColor')}>
                <option value="">{t('storePage.filterColor')}</option>
                {colorChoices.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label={t('storePage.sortBy')}>
              <option value="recommended">{t('storePage.sortRecommended')}</option>
              <option value="newest">{t('storePage.sortNewest')}</option>
              <option value="priceLow">{t('storePage.sortPriceLow')}</option>
              <option value="priceHigh">{t('storePage.sortPriceHigh')}</option>
            </select>
          </div>
        </div>
      )}

      <div className="products-grid">
        {visibleProducts.map((p) => {
          const weightStore = usesWeightPricing(store.category)
          const hasColorVariants = p.colorVariants && p.colorVariants.length > 0
          const selectedColor = selectedColors[p.id]
          const activeVariant = hasColorVariants && selectedColor
            ? p.colorVariants.find((v) => v.color === selectedColor)
            : hasColorVariants ? p.colorVariants[0] : null
          const displayImages = activeVariant?.imageUrls?.length > 0
            ? activeVariant.imageUrls
            : (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : null)
          return (
          <article key={p.id} className={`product-card ${p.status === 'DRAFT' ? 'is-draft' : ''}`}>
            {canManage && p.status === 'DRAFT' && (
              <label className="draft-badge">
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelected(p.id)} />
                {t('storePage.draft')}
              </label>
            )}
            {displayImages && displayImages.length > 0 ? (
              <Link to={`/product/${p.id}?store=${encodeURIComponent(slug)}`} className="product-card-images-link" onClick={handleProductNavigate}>
                <div className="product-card-images">
                  {displayImages.map((url, i) => (
                    <img key={i} src={url} alt="" className="product-card-image" />
                  ))}
                </div>
              </Link>
            ) : (
              <div className="product-card-image-placeholder">{t('storePage.noImage')}</div>
            )}
            {hasColorVariants && (
              <div className="product-color-swatches">
                {p.colorVariants.map((v) => (
                  <button
                    key={v.color}
                    type="button"
                    className={`color-swatch ${selectedColor === v.color ? 'active' : ''}`}
                    onClick={() => setSelectedColors((prev) => ({ ...prev, [p.id]: v.color }))}
                    title={v.color}
                  >
                    {v.color}
                  </button>
                ))}
              </div>
            )}
            <h3 className="product-name">
              <Link to={`/product/${p.id}?store=${encodeURIComponent(slug)}`} className="product-name-link" onClick={handleProductNavigate}>{productName(p, lang)}</Link>
            </h3>
            {p.description && <p className="product-desc">{p.description}</p>}
            <p className="product-price">
              {hasPrice(p) ? `₪${Number(p.price).toFixed(2)}` : <span className="product-no-price">{t('storePage.noPrice')}</span>}
              {weightStore && p.sizeStock?.length ? <span className="product-price-per-kg">{t('storePage.perKg')}</span> : null}
            </p>
            {weightStore && p.sizeStock?.length && selectedSizes[p.id] ? (
              <p className="product-pack-subtotal">
                {t('storePage.thisPack')}: ₪{lineUnitPrice({ ...p, storeCategory: store.category }, selectedSizes[p.id]).toFixed(2)}
              </p>
            ) : null}
            {p.sizeStock?.length > 0 ? (
                <p className="product-stock">
                  {canViewStockNumbers
                    ? (p.sizeStock.filter((s) => (s.quantity || 0) > 0).map((s) => `${s.size}: ${s.quantity}`).join(' · ') || t('storePage.outOfStock'))
                    : t('storePage.inStock')}
                </p>
              ) : hasColorVariants && activeVariant ? (
                <p className="product-stock">
                  {canViewStockNumbers
                    ? (p.colorVariants.filter((v) => (v.quantity ?? 0) > 0).map((v) => `${v.color}: ${v.quantity}`).join(' · ') || t('storePage.outOfStock'))
                    : t('storePage.inStock')}
                </p>
              ) : (
                <p className="product-stock">
                  {p.stockQuantity > 0
                    ? (canViewStockNumbers ? `${t('storePage.inStock')}: ${p.stockQuantity}` : t('storePage.inStock'))
                    : t('storePage.outOfStock')}
                </p>
              )}
            <div className="product-card-actions">
              {p.sizeStock?.length > 0 ? (
                <>
                  <select
                    value={selectedSizes[p.id] || ''}
                    onChange={(e) => setSelectedSizes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="product-size-select"
                  >
                    <option value="">{weightStore ? t('storePage.weight') : t('addProduct.size')}</option>
                    {p.sizeStock.filter((s) => (s.quantity || 0) > 0).map((s) => (
                      <option key={s.size} value={s.size}>
                        {canViewStockNumbers ? `${s.size} (${s.quantity})` : s.size}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedSizes[p.id] || !isSellable(p)}
                    onClick={() => addToCart({ ...p, storeId: store.id, storeName: store.name, storeCategory: store.category }, 1, selectedSizes[p.id], hasColorVariants ? selectedColor || activeVariant?.color : null)}
                  >
                    {t('storePage.addToCart')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!isSellable(p) || (hasColorVariants ? ((activeVariant?.quantity ?? 0) <= 0) : (p.stockQuantity <= 0))}
                  onClick={() => addToCart({ ...p, storeId: store.id, storeName: store.name, storeCategory: store.category }, 1, null, hasColorVariants ? selectedColor || activeVariant?.color : null)}
                >
                  {t('storePage.addToCart')}
                </button>
              )}
              {isLoggedIn && (
                <div className="product-manage">
                  {canManage && (
                    <button
                      type="button"
                      className={`btn btn-sm ${p.status === 'DRAFT' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => togglePublished(p)}
                      disabled={p.status === 'DRAFT' && !hasPrice(p)}
                      title={p.status === 'DRAFT' && !hasPrice(p) ? t('storePage.noPrice') : ''}
                    >
                      {p.status === 'DRAFT' ? t('storePage.publish') : t('storePage.unpublish')}
                    </button>
                  )}
                  {canManage && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeProductImages(p)}>
                      Remove image
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-edit btn-sm"
                    onClick={() => openEditProduct(p)}
                    disabled={!canManage}
                    title={!canManage ? t('storePage.nonAdminEditHint') : ''}
                  >
                    {t('storePage.editProduct')}
                  </button>
                  {canManage && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ type: 'product', id: p.id, name: p.name })}>
                      {t('storePage.deleteProduct')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        )})}
      </div>
      {products.length === 0 && <p className="empty">{t('storePage.noProducts')}</p>}

      {/* Edit store modal */}
      {editStoreOpen && (
        <div className="modal-overlay" onClick={() => setEditStoreOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('storePage.editStore')}</h2>
            <form onSubmit={saveStore}>
              <label>
                {t('createStore.storeName')}
                <input type="text" value={editStoreName} onChange={(e) => setEditStoreName(e.target.value)} required />
              </label>
              <label>
                {t('createStore.storeIcon')}
                <div className="upload-row">
                  <input type="file" accept="image/*" onChange={handleStoreIconFile} disabled={uploadingIcon} className="input-file" />
                  {uploadingIcon && <span className="upload-status">{t('upload.uploading')}</span>}
                  {editStoreIconUrl && <div className="upload-preview"><img src={editStoreIconUrl} alt="" /></div>}
                </div>
              </label>
              <label>
                {t('createStore.category')}
                <select value={editStoreCategory} onChange={(e) => setEditStoreCategory(e.target.value)}>
                  {STORE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{t('category.' + item) || item}</option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditStoreOpen(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={savingStore}>{savingStore ? t('common.saving') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit product modal */}
      {editProductOpen && editProduct && (
        <div className="modal-overlay" onClick={() => { setEditModalError(''); setEditProductOpen(false); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{t('storePage.editProduct')}</h2>
            {editModalError && <div className="form-error">{editModalError}</div>}
            <form onSubmit={saveProduct}>
              <label>
                {t('addProduct.productName')}
                <input type="text" value={editProductName} onChange={(e) => setEditProductName(e.target.value)} required />
              </label>
              <label>
                {t('addProduct.description')}
                <textarea value={editProductDesc} onChange={(e) => setEditProductDesc(e.target.value)} rows={3} />
              </label>
              <div className="form-images">
                <span className="form-images-label">{t('addProduct.images')}</span>
                {editProductImageUrls.map((url, index) => (
                  <div key={index} className="form-image-row">
                    <input
                      ref={(el) => { editFileInputRefs.current[index] = el }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleEditProductImageFile(index, e)}
                      disabled={uploadingProductImage !== null}
                      className="input-file input-file-hidden"
                    />
                    <button
                      type="button"
                      className="btn-choose-file"
                      disabled={uploadingProductImage !== null}
                      onClick={() => editFileInputRefs.current[index]?.click()}
                    >
                      {uploadingProductImage === index ? t('upload.uploading') : t('upload.chooseFile')}
                    </button>
                    {url && <div className="upload-preview"><img src={url} alt="" /></div>}
                    <button type="button" className="btn-remove-image" onClick={() => removeEditProductImageSlot(index)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-add-image" onClick={addEditProductImageSlot}>{t('addProduct.addImage')}</button>
              </div>
              <div className="form-sizes">
                <span className="form-images-label">{t('addProduct.sizes')}</span>
                {editProductSizeStocks.map((row, index) => (
                  <div key={index} className="form-size-row">
                    <select value={row.size} onChange={(e) => setEditSizeStockAt(index, 'size', e.target.value)} className="input-size">
                      {SIZE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                    <input type="number" min="0" value={row.quantity} onChange={(e) => setEditSizeStockAt(index, 'quantity', e.target.value)} className="input-qty" />
                    <button type="button" className="btn-remove-image" onClick={() => removeEditSizeRow(index)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-add-image" onClick={addEditSizeRow}>{t('addProduct.addSize')}</button>
              </div>
              <div className="form-color-variants">
                <span className="form-images-label">{t('addProduct.colorVariants')}</span>
                <p className="field-hint">{t('addProduct.colorVariantsHint')}</p>
                {editProductColorVariants.map((cv, ci) => (
                  <div key={ci} className="color-variant-block">
                    <div className="color-variant-header">
                      <input
                        type="text"
                        placeholder={t('addProduct.colorName')}
                        value={cv.color}
                        onChange={(e) => setEditColorVariantAt(ci, 'color', e.target.value)}
                        className="input-color-name"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={cv.quantity ?? ''}
                        onChange={(e) => setEditColorVariantAt(ci, 'quantity', e.target.value)}
                        className="input-color-qty"
                      />
                      <button type="button" className="btn-remove-image" onClick={() => removeEditColorVariant(ci)}>✕</button>
                    </div>
                    <div className="form-image-row-wrap">
                      {(cv.imageUrls || ['']).map((url, ii) => (
                        <div key={ii} className="form-image-row">
                          <input
                            ref={(el) => { editColorFileRefs.current[`${ci}-${ii}`] = el }}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleEditColorImageFile(ci, ii, e)}
                            disabled={uploadingColorEdit !== null}
                            className="input-file input-file-hidden"
                          />
                          <button
                            type="button"
                            className="btn-choose-file"
                            disabled={uploadingColorEdit !== null}
                            onClick={() => editColorFileRefs.current[`${ci}-${ii}`]?.click()}
                          >
                            {uploadingColorEdit?.ci === ci && uploadingColorEdit?.ii === ii ? t('upload.uploading') : t('upload.chooseFile')}
                          </button>
                          {url && <div className="upload-preview"><img src={url} alt="" /></div>}
                          <button type="button" className="btn-remove-image" onClick={() => removeEditColorVariantImage(ci, ii)}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="btn-add-image" onClick={() => addEditColorVariantImage(ci)}>{t('addProduct.addImage')}</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-image" onClick={addEditColorVariant}>{t('addProduct.addColor')}</button>
              </div>
              {categories.length > 0 && (
                <label>
                  {t('storePage.subcategory')}
                  <select value={editProductCategoryId} onChange={(e) => setEditProductCategoryId(e.target.value)}>
                    <option value="">—</option>
                    {categories.filter((c) => c.parentId == null).map((g) => {
                      const children = categories.filter((c) => c.parentId === g.id)
                      return children.length === 0
                        ? <option key={g.id} value={g.id}>{categoryLabel(g)}</option>
                        : (
                          <optgroup key={g.id} label={categoryLabel(g)}>
                            {children.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}
                          </optgroup>
                        )
                    })}
                  </select>
                </label>
              )}
              <label>
                {t('addProduct.price')}
                <input type="number" step="0.01" min="0.01" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} required={editProduct?.status !== 'DRAFT'} />
              </label>
              <label>
                {t('addProduct.stockQuantity')}
                <input type="number" min="0" value={editProductStock} onChange={(e) => setEditProductStock(e.target.value)} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setEditModalError(''); setEditProductOpen(false); }}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={savingProduct}>{savingProduct ? t('common.saving') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <p>
              {deleteConfirm.type === 'store'
                ? t('storePage.confirmDeleteStore')
                : t('storePage.confirmDeleteProduct').replace('{name}', deleteConfirm.name || '')}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteConfirm.type === 'store' ? handleDeleteStore : handleDeleteProduct}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
