import { useState, useRef } from 'react'
import { createStore, uploadImage } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './AddProduct.css'

export default function CreateStore() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('KITCHEN')
  const [iconUrl, setIconUrl] = useState('')
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const iconInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleIconFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIcon(true)
    setError('')
    try {
      const url = await uploadImage(file)
      setIconUrl(url)
    } catch (err) {
      setError(err.message || t('upload.error'))
    } finally {
      setUploadingIcon(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!name.trim()) {
      setError('Enter a store name.')
      return
    }
    setLoading(true)
    try {
      await createStore(name.trim(), category, iconUrl)
      setSuccess(true)
      setName('')
      setIconUrl('')
    } catch (err) {
      setError(err.message || t('createStore.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-product create-store-page">
      <h1>{t('createStore.title')}</h1>
      <form className="add-product-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{t('createStore.success')}</div>}
        <label>
          {t('createStore.storeName')}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="My Store" />
        </label>
        <label>
          {t('createStore.storeIcon')}
          <div className="upload-row">
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconFile}
              disabled={uploadingIcon}
              className="input-file"
            />
            {uploadingIcon && <span className="upload-status">{t('upload.uploading')}</span>}
            {iconUrl && (
              <div className="upload-preview">
                <img src={iconUrl} alt="" />
                <button type="button" className="btn-remove-image" onClick={() => setIconUrl('')} title={t('cart.remove')}>✕</button>
              </div>
            )}
          </div>
          <span className="field-hint">{t('createStore.storeIconHint')}</span>
        </label>
        <label>
          {t('createStore.category')}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="KITCHEN">{t('category.KITCHEN')}</option>
            <option value="CLOTHING">{t('category.CLOTHING')}</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('createStore.creating') : t('createStore.createStore')}
        </button>
      </form>
    </div>
  )
}
