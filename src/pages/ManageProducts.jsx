import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStores, getProducts } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import { categoryEmoji, storeDisplayName } from '../utils/categoryDisplay'
import './ManageProducts.css'

/** Admin overview: one card per store with draft/published counts, linking to the store page where products are edited and published. */
export default function ManageProducts() {
  const { t } = useLanguage()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stores = await getStores()
        const withCounts = await Promise.all(
          stores.map(async (store) => {
            const products = await getProducts(store.id)
            const drafts = products.filter((p) => p.status === 'DRAFT')
            return {
              store,
              total: products.length,
              drafts: drafts.length,
              published: products.length - drafts.length,
              cover: products.find((p) => p.imageUrls?.length)?.imageUrls[0]
                || products.find((p) => p.colorVariants?.[0]?.imageUrls?.length)?.colorVariants[0].imageUrls[0],
            }
          }),
        )
        if (!cancelled) setRows(withCounts)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="page-loading">{t('storePage.loading')}</div>
  if (error) return <div className="page-error">{error}</div>

  const totals = rows.reduce((a, r) => ({ drafts: a.drafts + r.drafts, published: a.published + r.published }), { drafts: 0, published: 0 })

  return (
    <div className="manage-page">
      <h1>{t('manage.title')}</h1>
      <p className="manage-summary">
        {t('manage.drafts')}: <strong>{totals.drafts}</strong> · {t('manage.published')}: <strong>{totals.published}</strong>
      </p>
      <p className="manage-hint">{t('manage.hint')}</p>
      <div className="manage-grid">
        {rows.map(({ store, total, drafts, published, cover }) => (
          <Link key={store.id} to={`/store/${store.slug}`} className="manage-card">
            <div className="manage-card-image">
              {cover ? <img src={cover} alt="" /> : <span aria-hidden="true">{categoryEmoji(store.category)}</span>}
            </div>
            <div className="manage-card-body">
              <h2>{categoryEmoji(store.category)} {storeDisplayName(store, t)}</h2>
              <p>{t('category.' + store.category) || store.category}</p>
              <p className="manage-counts">
                <span className="manage-badge manage-badge-draft">{t('manage.drafts')}: {drafts}</span>
                <span className="manage-badge">{t('manage.published')}: {published}</span>
              </p>
              <span className="btn btn-primary btn-sm">{t('manage.open')} ({total})</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
