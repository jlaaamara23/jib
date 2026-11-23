import { useEffect, useState } from 'react'
import { getAllOrdersForAdmin, updateOrderFulfillment } from '../api/api'
import { useLanguage } from '../context/LanguageContext'
import { sizedImage } from '../utils/image'
import './OrdersAdmin.css'

// The team's order board: every order with photos, delivery details and its handling status.
const STEPS = ['NEW', 'PACKED', 'SHIPPED', 'DELIVERED']

// Israeli numbers like 050-1234567 become 972501234567 for a wa.me link.
const whatsappNumber = (phone) => {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits
}

export default function OrdersAdmin() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('NEW')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  const load = () => {
    setLoading(true)
    getAllOrdersForAdmin()
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setError('') })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)  // new orders show up without a refresh
    return () => clearInterval(timer)
  }, [])

  const setStatus = async (order, fulfillment) => {
    setSaving(order.id)
    try {
      await updateOrderFulfillment(order.id, fulfillment)
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, fulfillment } : o)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const count = (s) => orders.filter((o) => (o.fulfillment || 'NEW') === s).length
  const shown = filter === 'ALL' ? orders : orders.filter((o) => (o.fulfillment || 'NEW') === filter)

  return (
    <div className="orders-admin">
      <div className="orders-admin-head">
        <h1>{t('ordersAdmin.title')}</h1>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>{t('ordersAdmin.refresh')}</button>
      </div>
      <div className="orders-admin-tabs">
        {[...STEPS, 'ALL'].map((s) => (
          <button key={s} type="button" className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
            {t(`ordersAdmin.status.${s}`)} <span>{s === 'ALL' ? orders.length : count(s)}</span>
          </button>
        ))}
      </div>
      {error && <div className="cart-error">{error}</div>}
      {!loading && shown.length === 0 && <p className="empty">{t('ordersAdmin.none')}</p>}
      <ul className="orders-admin-list">
        {shown.map((o) => {
          const phone = o.shippingPhone || o.customerPhone
          const wa = whatsappNumber(phone)
          const step = o.fulfillment || 'NEW'
          return (
            <li key={o.id} className={`oa-card oa-${step.toLowerCase()}`}>
              <div className="oa-top">
                <b>#{o.id}</b>
                <span>{o.createdAt ? new Date(o.createdAt).toLocaleString('he-IL') : ''}</span>
                <span className="oa-store">{o.storeName}</span>
                <span className={`oa-badge oa-badge-${step.toLowerCase()}`}>{t(`ordersAdmin.status.${step}`)}</span>
              </div>
              <div className="oa-customer">
                <div><b>{o.shippingName || o.customerEmail || '-'}</b></div>
                <div>{[o.shippingAddress, o.shippingCity].filter(Boolean).join(', ') || t('ordersAdmin.noAddress')}</div>
                {o.shippingNotes && <div className="oa-notes">{t('ordersAdmin.notes')}: {o.shippingNotes}</div>}
                <div className="oa-contact">
                  {phone && <a href={`tel:${phone}`}>📞 {phone}</a>}
                  {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(t('ordersAdmin.waText').replace('{id}', o.id))}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
                  {o.customerEmail && <span>✉️ {o.customerEmail}</span>}
                </div>
              </div>
              <ul className="oa-items">
                {(o.items || []).map((item, i) => (
                  <li key={`${item.productId}-${i}`}>
                    {item.imageUrl ? <img src={sizedImage(item.imageUrl, 160)} alt="" loading="lazy" /> : <span className="oa-noimg" />}
                    <div>
                      <div className="oa-item-name">{item.productNameHe || item.productName}</div>
                      <div className="oa-item-meta">
                        {t('ordersAdmin.qty')}: <b>{item.quantity}</b>
                        {item.size ? ` · ${t('ordersAdmin.size')}: ${item.size}` : ''}
                        {item.color ? ` · ${t('ordersAdmin.color')}: ${item.color}` : ''}
                        {item.unitPrice != null ? ` · ₪${Number(item.unitPrice).toFixed(2)}` : ''}
                      </div>
                      <div className="oa-item-id">{t('ordersAdmin.productNo')} {item.productId}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="oa-bottom">
                <div className="oa-total">
                  {t('ordersAdmin.total')}: <b>₪{Number(o.totalPrice).toFixed(2)}</b>
                  {Number(o.shippingFee) > 0 && <span> ({t('ordersAdmin.inclShipping')} ₪{Number(o.shippingFee).toFixed(2)})</span>}
                  <span className="oa-paid">{o.status === 'PAID' ? t('ordersAdmin.paid') : t('ordersAdmin.notPaid')}</span>
                </div>
                <div className="oa-steps">
                  {STEPS.map((s) => (
                    <button key={s} type="button" className={step === s ? 'active' : ''} disabled={saving === o.id || step === s} onClick={() => setStatus(o, s)}>
                      {t(`ordersAdmin.status.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
