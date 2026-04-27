import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyOrders, getAllOrdersForAdmin, deleteOrder } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import './MyOrders.css'

export default function MyOrders() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingOrderId, setDeletingOrderId] = useState(null)
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    const loadOrders = isAdmin ? getAllOrdersForAdmin : getMyOrders
    loadOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [isAdmin])

  const canDeleteOrder = (order) => {
    const role = user?.role
    const isPrivileged = role === 'ADMIN' || role === 'OWNER'
    return isPrivileged && (order.status === 'PENDING' || order.status === 'CANCELLED')
  }

  const handleDeleteOrder = async (orderId) => {
    setError(null)
    setDeletingOrderId(orderId)
    try {
      await deleteOrder(orderId)
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (e) {
      setError(e.message || 'Failed to delete order')
    } finally {
      setDeletingOrderId(null)
    }
  }

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
              {isAdmin && (
                <>
                  <p className="order-store">Customer ID: {o.customerId}</p>
                  <p className="order-store">Customer: {o.customerEmail || '-'}</p>
                  <p className="order-store">Phone: {o.customerPhone || '-'}</p>
                  <p className="order-store">Store: {o.storeName || `#${o.storeId}`}</p>
                  {o.createdAt && <p className="order-store">Created: {new Date(o.createdAt).toLocaleString()}</p>}
                </>
              )}
              <p className="order-store">{t('myOrders.storeId')}: {o.storeId}</p>
              <p className="order-total">{t('myOrders.total')}: ₪{Number(o.totalPrice).toFixed(2)}</p>
              {isAdmin && Array.isArray(o.items) && o.items.length > 0 && (
                <div className="order-items">
                  <p className="order-items-title">Items:</p>
                  <ul className="order-items-list">
                    {o.items.map((item, idx) => (
                      <li key={`${o.id}-${item.productId}-${idx}`}>
                        {item.productName} x{item.quantity}
                        {item.size ? `, size ${item.size}` : ''}
                        {item.color ? `, color ${item.color}` : ''}
                        {typeof item.unitPrice === 'number' ? `, ₪${Number(item.unitPrice).toFixed(2)} each` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canDeleteOrder(o) && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteOrder(o.id)}
                  disabled={deletingOrderId === o.id}
                >
                  {deletingOrderId === o.id ? 'Deleting…' : 'Delete order'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
