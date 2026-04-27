import { useState, useEffect, useRef } from 'react'
import { getStores, addProduct, uploadImage, createStore } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './AddProduct.css'

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

export default function AddProduct() {
  const { t } = useLanguage()
  const fileInputRefs = useRef([])
  const bulkFileInputRef = useRef(null)
  const [stores, setStores] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [storeId, setStoreId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [sizeStocks, setSizeStocks] = useState([])
  const [imageUrls, setImageUrls] = useState([''])
  const [bulkPerImagePricing, setBulkPerImagePricing] = useState(false)
  const [imagePrices, setImagePrices] = useState({})
  const [colorVariants, setColorVariants] = useState([])
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [uploadingColor, setUploadingColor] = useState(null)
  const colorFileRefs = useRef({})
  const SIZE_OPTIONS = SIZE_OPTIONS_BY_CATEGORY[selectedCategory] || DEFAULT_SIZE_OPTIONS
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch(() => setStores([]))
  }, [])

  useEffect(() => {
    if (!selectedCategory) {
      setStoreId('')
      return
    }
    const firstStoreInCategory = stores.find((store) => store.category === selectedCategory)
    setStoreId(firstStoreInCategory ? String(firstStoreInCategory.id) : '')
  }, [selectedCategory, stores])

  const addImageField = () => setImageUrls((prev) => [...prev, ''])
  const removeImageField = (index) => setImageUrls((prev) => prev.filter((_, i) => i !== index))
  const setImageUrlAt = (index, value) => setImageUrls((prev) => {
    const next = [...prev]
    next[index] = value
    return next
  })
  const setImagePriceAt = (index, value) => setImagePrices((prev) => ({ ...prev, [index]: value }))

  const addSizeRow = () => setSizeStocks((prev) => [...prev, { size: SIZE_OPTIONS[0], quantity: '' }])
  const removeSizeRow = (index) => setSizeStocks((prev) => prev.filter((_, i) => i !== index))
  const setSizeStockAt = (index, field, value) => setSizeStocks((prev) => {
    const next = prev.map((s, i) => i === index ? { ...s, [field]: value } : s)
    return next
  })

  const addColorVariant = () => setColorVariants((prev) => [...prev, { color: '', imageUrls: [''], quantity: '' }])
  const removeColorVariant = (colorIndex) => setColorVariants((prev) => prev.filter((_, i) => i !== colorIndex))
  const setColorVariantAt = (colorIndex, field, value) => setColorVariants((prev) => {
    const next = prev.map((cv, i) => i === colorIndex ? { ...cv, [field]: value } : cv)
    return next
  })
  const setColorVariantImageAt = (colorIndex, imgIndex, value) => setColorVariants((prev) => {
    const next = prev.map((cv, i) => {
      if (i !== colorIndex) return cv
      const urls = [...(cv.imageUrls || [''])]
      urls[imgIndex] = value
      return { ...cv, imageUrls: urls }
    })
    return next
  })
  const addColorVariantImage = (colorIndex) => setColorVariants((prev) => prev.map((cv, i) => i === colorIndex ? { ...cv, imageUrls: [...(cv.imageUrls || []), ''] } : cv))
  const removeColorVariantImage = (colorIndex, imgIndex) => setColorVariants((prev) => prev.map((cv, i) => i === colorIndex ? { ...cv, imageUrls: (cv.imageUrls || []).filter((_, j) => j !== imgIndex) } : cv))

  const handleImageFile = async (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIndex(index)
    setError('')
    try {
      const url = await uploadImage(file)
      setImageUrlAt(index, url)
    } catch (err) {
      setError(err.message || t('upload.error'))
    } finally {
      setUploadingIndex(null)
      e.target.value = ''
    }
  }

  const handleBulkImageFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploadingBulk(true)
    setError('')
    const uploadedUrls = []
    let failedCount = 0
    let firstFailureReason = ''
    for (const file of files) {
      try {
        const url = await uploadImage(file)
        uploadedUrls.push(url)
      } catch (firstErr) {
        try {
          // Retry once for transient network/backend issues.
          const retryUrl = await uploadImage(file)
          uploadedUrls.push(retryUrl)
        } catch (secondErr) {
          failedCount += 1
          if (!firstFailureReason) {
            firstFailureReason =
              secondErr?.message ||
              firstErr?.message ||
              t('upload.error')
          }
        }
      }
    }
    setImageUrls((prev) => {
      const existing = prev.map((u) => u.trim()).filter(Boolean)
      const merged = [...existing, ...uploadedUrls]
      return merged.length > 0 ? merged : ['']
    })
    if (failedCount > 0) {
      setError(`${failedCount} image(s) failed to upload. ${firstFailureReason}`)
    }
    setUploadingBulk(false)
    e.target.value = ''
  }

  const handleColorImageFile = async (colorIndex, imgIndex, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingColor({ colorIndex, imgIndex })
    setError('')
    try {
      const url = await uploadImage(file)
      setColorVariantImageAt(colorIndex, imgIndex, url)
    } catch (err) {
      setError(err.message || t('upload.error'))
    } finally {
      setUploadingColor(null)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    let sid = storeId ? Number(storeId) : null
    const hasValidSinglePrice = price !== '' && Number(price) >= 0
    if (!selectedCategory) {
      setError('Please select a category.')
      return
    }
    if (!name.trim()) {
      setError('Please enter product name.')
      return
    }
    if (!bulkPerImagePricing && !hasValidSinglePrice) {
      setError('Please enter a valid price.')
      return
    }
    const imageEntries = imageUrls
      .map((u, index) => ({ url: u.trim(), index }))
      .filter((item) => Boolean(item.url))
    const urls = imageEntries.map((item) => item.url)
    const sizeStocksPayload = sizeStocks
      .map((s) => ({ size: s.size, quantity: Math.max(0, parseInt(s.quantity, 10) || 0) }))
      .filter((s) => s.quantity > 0)
    const totalFromSizes = sizeStocksPayload.reduce((sum, s) => sum + s.quantity, 0)
    const colorVariantsPayload = colorVariants
      .filter((cv) => (cv.color || '').trim())
      .map((cv) => ({
        color: (cv.color || '').trim(),
        imageUrls: (cv.imageUrls || []).map((u) => (typeof u === 'string' ? u : '').trim()).filter(Boolean),
        quantity: Math.max(0, parseInt(cv.quantity, 10) || 0),
      }))
      .filter((cv) => cv.imageUrls.length > 0)
    setLoading(true)
    try {
      if (!sid) {
        const categoryLabel = t('category.' + selectedCategory) || selectedCategory
        const autoStoreName = `${categoryLabel} Store ${Date.now()}`
        const newStore = await createStore(autoStoreName, selectedCategory)
        sid = newStore?.id ? Number(newStore.id) : null
        if (!sid) {
          throw new Error('Failed to create store for this category.')
        }
        setStores((prev) => [...prev, newStore])
        setStoreId(String(sid))
      }

      const shouldCreatePerImageProducts = imageEntries.length > 1
      if (shouldCreatePerImageProducts) {
        for (let i = 0; i < imageEntries.length; i += 1) {
          const entry = imageEntries[i]
          let productPrice = Number(price)
          if (bulkPerImagePricing) {
            const customPrice = Number(imagePrices[entry.index])
            if (Number.isNaN(customPrice) || customPrice < 0) {
              throw new Error(`Please enter a valid price for image ${i + 1}.`)
            }
            productPrice = customPrice
          } else if (Number.isNaN(productPrice) || productPrice < 0) {
            throw new Error('Please enter a valid price.')
          }
          await addProduct({
            storeId: sid,
            name: `${name.trim()} ${i + 1}`,
            description: description.trim() || null,
            price: productPrice,
            stockQuantity: totalFromSizes > 0 ? totalFromSizes : Math.max(0, parseInt(stockQuantity, 10) || 0),
            imageUrls: [entry.url],
            sizeStocks: sizeStocksPayload.length > 0 ? sizeStocksPayload : null,
            colorVariants: null,
          })
        }
      } else {
        await addProduct({
          storeId: sid,
          name: name.trim(),
          description: description.trim() || null,
          price: Number(price),
          stockQuantity: totalFromSizes > 0 ? totalFromSizes : Math.max(0, parseInt(stockQuantity, 10) || 0),
          imageUrls: urls.length ? urls : null,
          sizeStocks: sizeStocksPayload.length > 0 ? sizeStocksPayload : null,
          colorVariants: colorVariantsPayload.length > 0 ? colorVariantsPayload : null,
        })
      }
      setSuccess(true)
      setName('')
      setDescription('')
      setPrice('')
      setStockQuantity('0')
      setSizeStocks([])
      setImageUrls([''])
      setImagePrices({})
      setBulkPerImagePricing(false)
      setColorVariants([])
    } catch (err) {
      setError(err.message || t('addProduct.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-product">
      <h1>{t('addProduct.title')}</h1>
      <form className="add-product-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{t('addProduct.success')}</div>}
        <label>
          {t('createStore.category')}
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required>
            <option value="">{t('addProduct.selectCategory')}</option>
            {STORE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t('category.' + category) || category}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('addProduct.productName')}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          {t('addProduct.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <div className="form-images">
          <span className="form-images-label">{t('addProduct.images')}</span>
          <input
            ref={bulkFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleBulkImageFiles}
            disabled={uploadingBulk || uploadingIndex !== null}
            className="input-file input-file-hidden"
          />
          <button
            type="button"
            className="btn-add-image"
            disabled={uploadingBulk || uploadingIndex !== null}
            onClick={() => bulkFileInputRef.current?.click()}
          >
            {uploadingBulk ? t('addProduct.uploadingMany') : t('addProduct.bulkUploadImages')}
          </button>
          {imageUrls.map((url, index) => (
            <div key={index} className="form-image-row">
              <input
                ref={(el) => { fileInputRefs.current[index] = el }}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFile(index, e)}
                disabled={uploadingIndex !== null}
                className="input-file input-file-hidden"
              />
              <button
                type="button"
                className="btn-choose-file"
                disabled={uploadingIndex !== null || uploadingBulk}
                onClick={() => fileInputRefs.current[index]?.click()}
              >
                {uploadingIndex === index ? t('upload.uploading') : t('upload.chooseFile')}
              </button>
              {url && (
                <div className="upload-preview">
                  <img src={url} alt="" />
                </div>
              )}
              <button type="button" className="btn-remove-image" onClick={() => removeImageField(index)} title={t('cart.remove')}>✕</button>
            </div>
          ))}
          <button type="button" className="btn-add-image" onClick={addImageField}>
            {t('addProduct.addImage')}
          </button>
          {imageUrls.map((u) => u.trim()).filter(Boolean).length > 1 && (
            <label>
              <input
                type="checkbox"
                checked={bulkPerImagePricing}
                onChange={(e) => setBulkPerImagePricing(e.target.checked)}
              />
              {' '}
              Create one product per image with different prices
            </label>
          )}
          {bulkPerImagePricing && imageUrls.map((url, index) => (
            url.trim() ? (
              <label key={`price-${index}`}>
                Price for image {index + 1}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={imagePrices[index] ?? ''}
                  onChange={(e) => setImagePriceAt(index, e.target.value)}
                  required
                />
              </label>
            ) : null
          ))}
        </div>
        <label>
          {t('addProduct.price')}
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required={!bulkPerImagePricing}
            disabled={bulkPerImagePricing}
          />
        </label>
        {(selectedCategory === 'SPICES' || selectedCategory === 'GROCERY') && (
          <p className="field-hint">{t('addProduct.pricePerKgHint')}</p>
        )}
        <div className="form-sizes">
          <span className="form-images-label">{t('addProduct.sizes')}</span>
          <p className="field-hint">{t('addProduct.sizesHint')}</p>
          {sizeStocks.map((row, index) => (
            <div key={index} className="form-size-row">
              <select
                value={row.size}
                onChange={(e) => setSizeStockAt(index, 'size', e.target.value)}
                className="input-size"
              >
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={row.quantity}
                onChange={(e) => setSizeStockAt(index, 'quantity', e.target.value)}
                className="input-qty"
              />
              <button type="button" className="btn-remove-image" onClick={() => removeSizeRow(index)} title={t('cart.remove')}>✕</button>
            </div>
          ))}
          <button type="button" className="btn-add-image" onClick={addSizeRow}>
            {t('addProduct.addSize')}
          </button>
        </div>
        <div className="form-color-variants">
          <span className="form-images-label">{t('addProduct.colorVariants')}</span>
          <p className="field-hint">{t('addProduct.colorVariantsHint')}</p>
          {colorVariants.map((cv, colorIndex) => (
            <div key={colorIndex} className="color-variant-block">
              <div className="color-variant-header">
                <input
                  type="text"
                  placeholder={t('addProduct.colorName')}
                  value={cv.color}
                  onChange={(e) => setColorVariantAt(colorIndex, 'color', e.target.value)}
                  className="input-color-name"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Qty"
                  value={cv.quantity ?? ''}
                  onChange={(e) => setColorVariantAt(colorIndex, 'quantity', e.target.value)}
                  className="input-color-qty"
                  title={t('addProduct.stockQuantity')}
                />
                <button type="button" className="btn-remove-image" onClick={() => removeColorVariant(colorIndex)} title={t('cart.remove')}>✕</button>
              </div>
              <div className="form-image-row-wrap">
                {(cv.imageUrls || ['']).map((url, imgIndex) => (
                  <div key={imgIndex} className="form-image-row">
                    <input
                      ref={(el) => { colorFileRefs.current[`${colorIndex}-${imgIndex}`] = el }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleColorImageFile(colorIndex, imgIndex, e)}
                      disabled={uploadingColor !== null}
                      className="input-file input-file-hidden"
                    />
                    <button
                      type="button"
                      className="btn-choose-file"
                      disabled={uploadingColor !== null}
                      onClick={() => colorFileRefs.current[`${colorIndex}-${imgIndex}`]?.click()}
                    >
                      {uploadingColor?.colorIndex === colorIndex && uploadingColor?.imgIndex === imgIndex ? t('upload.uploading') : t('upload.chooseFile')}
                    </button>
                    {url && (
                      <div className="upload-preview">
                        <img src={url} alt="" />
                      </div>
                    )}
                    <button type="button" className="btn-remove-image" onClick={() => removeColorVariantImage(colorIndex, imgIndex)} title={t('cart.remove')}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-add-image" onClick={() => addColorVariantImage(colorIndex)}>{t('addProduct.addImage')}</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-add-image" onClick={addColorVariant}>
            {t('addProduct.addColor')}
          </button>
        </div>
        <label>
          {t('addProduct.stockQuantity')}
          <input type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} title={t('addProduct.sizesHint')} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('addProduct.adding') : t('addProduct.addProduct')}
        </button>
      </form>
    </div>
  )
}
