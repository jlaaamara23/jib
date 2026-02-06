import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyOrders } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import './MyOrders.css'

export default function MyOrders() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">{t('myOrders.loading')}</div>
  if (error) return <div className="page-error">{t('common.error')}: {error}</div>

  return (
    <div className="my-orders">
      <h1>{t('myOrders.title')}</h1>
      {orders.length === 0 ? (
        <p className="empty">{t('myOrders.noOrders')} <Link to="/">{t('myOrders.browseStores')}</Link></p>
      ) : (
        <ul className="orders-list">
          {orders.map((o) => (
            <li key={o.id} className="order-card">
              <div className="order-header">
                <span className="order-id">{t('myOrders.orderId')}{o.id}</span>
                <span className="order-status">{o.status}</span>
              </div>
              <p className="order-store">{t('myOrders.storeId')}: {o.storeId}</p>
              <p className="order-total">{t('myOrders.total')}: ₪{Number(o.totalPrice).toFixed(2)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
