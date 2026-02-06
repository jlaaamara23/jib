import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const persist = useCallback((next) => {
    setItems((prev) => {
      const nextItems = typeof next === 'function' ? next(prev) : next
      localStorage.setItem('cart', JSON.stringify(nextItems))
      return nextItems
    })
  }, [])

  const addToCart = useCallback((product, quantity = 1, size = null) => {
    const sizeKey = size != null && size !== '' ? size : null
    persist((prev) => {
      const existing = prev.find((i) => i.id === product.id && i.storeId === product.storeId && (i.size || null) === sizeKey)
      const maxQty = sizeKey && product.sizeStock?.length
        ? (product.sizeStock.find((s) => s.size === sizeKey)?.quantity ?? 0)
        : (product.stockQuantity || 999)
      if (existing) {
        return prev.map((i) =>
          i.id === product.id && i.storeId === product.storeId && (i.size || null) === sizeKey
            ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) }
            : i
        )
      }
      return [...prev, { ...product, quantity, size: sizeKey }]
    })
  }, [persist])

  const updateQuantity = useCallback((productId, storeId, delta, size = null) => {
    const sizeKey = size != null && size !== '' ? size : null
    persist((prev) =>
      prev
        .map((i) => {
          if (i.id !== productId || i.storeId !== storeId || (i.size || null) !== sizeKey) return i
          const q = i.quantity + delta
          if (q <= 0) return null
          return { ...i, quantity: q }
        })
        .filter(Boolean)
    )
  }, [persist])

  const removeFromCart = useCallback((productId, storeId, size = null) => {
    const sizeKey = size != null && size !== '' ? size : null
    persist((prev) => prev.filter((i) => !(i.id === productId && i.storeId === storeId && (i.size || null) === sizeKey)))
  }, [persist])

  const clearCart = useCallback(() => {
    persist([])
  }, [persist])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)

  const value = {
    items,
    totalItems,
    totalPrice,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
