import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getStoreBySlug, getProducts, updateStore, deleteStore, updateProduct, deleteProduct, uploadImage } from '../api/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { lineUnitPrice, usesWeightPricing } from '../utils/weightPrice'
import './StorePage.css'

const STORE_CATEGORIES = [
  'KITCHEN',
  'SPICES',
  'GROCERY',
  'CLOTHING',
  'WOMEN_UNDERWEAR',
  'KIDS_UNDERWEAR',
  'CHILD_GAME',
  'ELECTRONICS',
  'BEAUTY',
  'HOME_DECOR',
  'SPORTS',
  'PETS',
  'HEALTH',
  'TOOLS',
  'OFFICE',
]

const SIZE_OPTIONS_BY_CATEGORY = {
  SPICES: ['250G', '500G', '1KG', '2KG', '5KG'],
  GROCERY: ['250G', '500G', '1KG', '2KG', '5KG'],
  KIDS_UNDERWEAR: ['2', '4', '6', '8', '10', '12', '14'],
}

const DEFAULT_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL']

export default function StorePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editFromQueryHandled = useRef(false)
  const { t } = useLanguage()
  const { user } = useAuth()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
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
  const SIZE_OPTIONS = SIZE_OPTIONS_BY_CATEGORY[store?.category] || DEFAULT_SIZE_OPTIONS

  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editModalError, setEditModalError] = useState('')
  const editFileInputRefs = useRef([])

  const canManage = store && user && user.role === 'ADMIN'
  const isLoggedIn = !!user

  const loadStore = () => {
    getStoreBySlug(slug)
      .then((s) => {
        setStore(s)
        return getProducts(s.id)
      })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStore()
  }, [slug])

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
    setEditProductPrice(String(p.price))
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
    const parsedPrice = Number(editProductPrice)
    if (!trimmedName) {
      setEditModalError('Please enter product name.')
      return
    }
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
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
        categoryId: editProduct.categoryId ?? null,
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
        price: Number(p.price),
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

  if (loading) return <div className="page-loading">{t('storePage.loading')}</div>
  if (error || !store) return <div className="page-error">{error || 'Store not found'}</div>

  return (
    <div className="store-page">
      <Link to="/" className="store-back">← {t('storePage.allStores')}</Link>
      <header className="store-header">
        <div className="store-header-icon-wrap">
          {store.iconUrl ? (
            <img src={store.iconUrl} alt="" className="store-header-icon" />
          ) : (
            <span className="store-header-icon-placeholder">◇</span>
          )}
        </div>
        <div className="store-header-text">
          <h1 className="store-page-title">{store.name}</h1>
          <p className="store-page-slug">/{store.slug}</p>
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

      <div className="products-grid">
        {products.map((p) => {
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
          <article key={p.id} className="product-card">
            {displayImages && displayImages.length > 0 ? (
              <div className="product-card-images">
                {displayImages.map((url, i) => (
                  <img key={i} src={url} alt="" className="product-card-image" />
                ))}
              </div>
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
              <Link to={`/product/${p.id}?store=${encodeURIComponent(slug)}`} className="product-name-link">{p.name}</Link>
            </h3>
            {p.description && <p className="product-desc">{p.description}</p>}
            <p className="product-price">
              ₪{Number(p.price).toFixed(2)}
              {weightStore && p.sizeStock?.length ? <span className="product-price-per-kg">{t('storePage.perKg')}</span> : null}
            </p>
            {weightStore && p.sizeStock?.length && selectedSizes[p.id] ? (
              <p className="product-pack-subtotal">
                {t('storePage.thisPack')}: ₪{lineUnitPrice({ ...p, storeCategory: store.category }, selectedSizes[p.id]).toFixed(2)}
              </p>
            ) : null}
            {p.sizeStock?.length > 0 ? (
                <p className="product-stock">
                  {p.sizeStock.filter((s) => (s.quantity || 0) > 0).map((s) => `${s.size}: ${s.quantity}`).join(' · ') || t('storePage.outOfStock')}
                </p>
              ) : hasColorVariants && activeVariant ? (
                <p className="product-stock">
                  {p.colorVariants.filter((v) => (v.quantity ?? 0) > 0).map((v) => `${v.color}: ${v.quantity}`).join(' · ') || t('storePage.outOfStock')}
                </p>
              ) : (
                <p className="product-stock">{p.stockQuantity > 0 ? `${t('storePage.inStock')}: ${p.stockQuantity}` : t('storePage.outOfStock')}</p>
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
                      <option key={s.size} value={s.size}>{s.size} ({s.quantity})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedSizes[p.id]}
                    onClick={() => addToCart({ ...p, storeId: store.id, storeName: store.name, storeCategory: store.category }, 1, selectedSizes[p.id], hasColorVariants ? selectedColor || activeVariant?.color : null)}
                  >
                    {t('storePage.addToCart')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={hasColorVariants ? ((activeVariant?.quantity ?? 0) <= 0) : (p.stockQuantity <= 0)}
                  onClick={() => addToCart({ ...p, storeId: store.id, storeName: store.name, storeCategory: store.category }, 1, null, hasColorVariants ? selectedColor || activeVariant?.color : null)}
                >
                  {t('storePage.addToCart')}
                </button>
              )}
              {isLoggedIn && (
                <div className="product-manage">
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
              <label>
                {t('addProduct.price')}
                <input type="number" step="0.01" min="0.01" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} required />
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
