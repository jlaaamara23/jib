import { useState, useEffect, useRef } from 'react'
import { getStores, addProduct, uploadImage } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './AddProduct.css'

export default function AddProduct() {
  const { t } = useLanguage()
  const fileInputRefs = useRef([])
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [sizeStocks, setSizeStocks] = useState([])
  const [imageUrls, setImageUrls] = useState([''])
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL']
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch(() => setStores([]))
  }, [])

  const addImageField = () => setImageUrls((prev) => [...prev, ''])
  const removeImageField = (index) => setImageUrls((prev) => prev.filter((_, i) => i !== index))
  const setImageUrlAt = (index, value) => setImageUrls((prev) => {
    const next = [...prev]
    next[index] = value
    return next
  })

  const addSizeRow = () => setSizeStocks((prev) => [...prev, { size: 'M', quantity: '' }])
  const removeSizeRow = (index) => setSizeStocks((prev) => prev.filter((_, i) => i !== index))
  const setSizeStockAt = (index, field, value) => setSizeStocks((prev) => {
    const next = prev.map((s, i) => i === index ? { ...s, [field]: value } : s)
    return next
  })

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const sid = storeId ? Number(storeId) : null
    if (!sid || !name.trim() || price === '' || Number(price) < 0) {
      setError('Please fill store, name, and a valid price.')
      return
    }
    const urls = imageUrls.map((u) => u.trim()).filter(Boolean)
    const sizeStocksPayload = sizeStocks
      .map((s) => ({ size: s.size, quantity: Math.max(0, parseInt(s.quantity, 10) || 0) }))
      .filter((s) => s.quantity > 0)
    const totalFromSizes = sizeStocksPayload.reduce((sum, s) => sum + s.quantity, 0)
    setLoading(true)
    try {
      await addProduct({
        storeId: sid,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        stockQuantity: totalFromSizes > 0 ? totalFromSizes : Math.max(0, parseInt(stockQuantity, 10) || 0),
        imageUrls: urls.length ? urls : null,
        sizeStocks: sizeStocksPayload.length > 0 ? sizeStocksPayload : null,
      })
      setSuccess(true)
      setName('')
      setDescription('')
      setPrice('')
      setStockQuantity('0')
      setSizeStocks([])
      setImageUrls([''])
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
          {t('addProduct.store')}
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
            <option value="">{t('addProduct.selectStore')}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
                disabled={uploadingIndex !== null}
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
        </div>
        <label>
          {t('addProduct.price')}
          <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
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
