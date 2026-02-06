import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { createOrder, createPaymentIntent, confirmPayment, getProfile } from '../api/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import './Cart.css'

const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePk ? loadStripe(stripePk) : null

function CheckoutForm({ clientSecret, orderIds, totalPrice, onSuccess, onError, t }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    onError('')
    try {
      const card = elements.getElement(CardElement)
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      })
      if (error) {
        onError(error.message || 'Payment failed')
        setLoading(false)
        return
      }
      if (paymentIntent?.status === 'succeeded') {
        await confirmPayment(paymentIntent.id, orderIds)
        onSuccess()
      } else {
        onError('Payment did not complete')
      }
    } catch (err) {
      onError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-card-wrapper">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fafafa',
                '::placeholder': { color: '#a1a1aa' },
              },
              invalid: { color: '#f87171' },
            },
          }}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-pay" disabled={!stripe || loading}>
        {loading ? t('cart.processing') : `${t('cart.pay')} ₪${Number(totalPrice).toFixed(2)}`}
      </button>
    </form>
  )
}

export default function Cart() {
  const { t } = useLanguage()
  const { items, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderIds, setOrderIds] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [paymentDone, setPaymentDone] = useState(false)
  const [paidWithCard, setPaidWithCard] = useState(false)

  const byStore = items.reduce((acc, item) => {
    const key = item.storeId
    if (!acc[key]) acc[key] = { storeName: item.storeName || `Store ${key}`, items: [] }
    acc[key].items.push(item)
    return acc
  }, {})

  useEffect(() => {
    if (!user?.email) return
    getProfile()
      .then(setProfile)
      .catch(() => setProfile({ email: user.email, phone: user.phone || '' }))
  }, [user?.email, user?.phone])

  const placeOrdersOnly = async () => {
    if (Object.keys(byStore).length === 0) return
    setError('')
    setLoading(true)
    try {
      const storeIds = Object.keys(byStore)
      for (const sid of storeIds) {
        const storeItems = byStore[sid].items
        const itemsPayload = storeItems.map((i) => ({ productId: i.id, quantity: i.quantity, size: i.size || undefined }))
        await createOrder(Number(sid), itemsPayload)
      }
      clearCart()
      setPaymentDone(true)
    } catch (err) {
      setError(err.message || 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToPayment = async () => {
    if (Object.keys(byStore).length === 0) return
    setError('')
    setLoading(true)
    try {
      const storeIds = Object.keys(byStore)
      const ids = []
      for (const sid of storeIds) {
        const storeItems = byStore[sid].items
        const itemsPayload = storeItems.map((i) => ({ productId: i.id, quantity: i.quantity, size: i.size || undefined }))
        const res = await createOrder(Number(sid), itemsPayload)
        ids.push(res.id)
      }
      setOrderIds(ids)
      const { clientSecret: secret } = await createPaymentIntent(totalPrice, 'ils')
      setClientSecret(secret)
    } catch (err) {
      setError(err.message || 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCart()
    setPaidWithCard(true)
    setPaymentDone(true)
    setClientSecret(null)
    setOrderIds(null)
  }

  if (items.length === 0 && !paymentDone) {
    return (
      <div className="cart-page">
        <h1>{t('cart.cart')}</h1>
        <p className="empty">{t('cart.empty')}</p>
        <Link to="/" className="btn btn-primary">{t('cart.browseStores')}</Link>
      </div>
    )
  }

  if (paymentDone) {
    return (
      <div className="cart-page">
        <h1>{t('cart.ordersPlaced')}</h1>
        <p className="success">
          {paidWithCard ? t('cart.paymentSuccess') : t('cart.ordersPlacedNoPayment')}
        </p>
        <Link to="/orders" className="btn btn-primary">{t('cart.viewOrders')}</Link>
      </div>
    )
  }

  if (clientSecret && orderIds?.length) {
    return (
      <div className="cart-page">
        <h1>{t('cart.payWithCard')}</h1>
        <p className="cart-total">{t('cart.total')}: ₪{totalPrice.toFixed(2)}</p>
        {error && <div className="cart-error">{error}</div>}
        {stripePromise ? (
          <StripeWrapper clientSecret={clientSecret} orderIds={orderIds} totalPrice={totalPrice} onSuccess={handlePaymentSuccess} onError={setError} t={t} />
        ) : (
          <p className="empty">{t('cart.paymentNotConfigured')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="cart-page">
      <h1>{t('cart.cart')}</h1>
      {error && <div className="cart-error">{error}</div>}

      <section className="cart-contact">
        <h2>1. {t('cart.verifyContact')}</h2>
        <p className="cart-contact-note">{t('cart.contactNote')}</p>
        <div className="cart-contact-fields">
          <div className="cart-contact-row">
            <span className="cart-contact-label">{t('cart.email')}</span>
            <span className="cart-contact-value">{profile?.email || user?.email || '—'}</span>
          </div>
          <div className="cart-contact-row">
            <span className="cart-contact-label">{t('cart.phone')}</span>
            <span className="cart-contact-value">{profile?.phone || user?.phone || '—'}</span>
          </div>
        </div>
      </section>

      <div className="cart-stores">
        {Object.entries(byStore).map(([storeId, { storeName, items: storeItems }]) => (
          <div key={storeId} className="cart-store">
            <h2>{storeName}</h2>
            <ul className="cart-list">
              {storeItems.map((item) => (
                <li key={`${item.id}-${item.storeId}-${item.size || ''}`} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}{item.size ? ` (${item.size})` : ''}</span>
                    <span className="cart-item-price">₪{Number(item.price).toFixed(2)} × {item.quantity}</span>
                  </div>
                  <div className="cart-item-actions">
                    <button type="button" onClick={() => updateQuantity(item.id, item.storeId, -1, item.size)} aria-label="-">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.storeId, 1, item.size)} aria-label="+">+</button>
                    <button type="button" className="cart-remove" onClick={() => removeFromCart(item.id, item.storeId, item.size)}>{t('cart.remove')}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="cart-footer">
        <p className="cart-total">{t('cart.total')}: ₪{totalPrice.toFixed(2)}</p>
        <h3 className="cart-step-title">2. {t('cart.payWithCard')}</h3>
        {!stripePk ? (
          <div className="cart-payment-info">
            <p>{t('cart.paymentNotConfigured')}</p>
            <p className="cart-payment-info-sub">{t('cart.paymentNotConfiguredSub')}</p>
          </div>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={handleProceedToPayment} disabled={loading || !stripePk}>
          {loading ? t('cart.preparing') : stripePk ? t('cart.proceedToPayment') : t('cart.proceedToPayment')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={placeOrdersOnly} disabled={loading}>
          {loading ? t('cart.placing') : t('cart.placeOrderNoPayment')}
        </button>
      </div>
    </div>
  )
}

function StripeWrapper({ clientSecret, orderIds, totalPrice, onSuccess, onError, t }) {
  if (!stripePromise || !clientSecret) return null
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        clientSecret={clientSecret}
        orderIds={orderIds}
        totalPrice={totalPrice}
        onSuccess={onSuccess}
        onError={onError}
        t={t}
      />
    </Elements>
  )
}
