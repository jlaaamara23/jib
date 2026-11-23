import { useEffect, useState } from 'react'

// Saved ("liked") products, kept on this device only. Each entry keeps what the wishlist page needs to show it.
const KEY = 'jibi-wishlist'
const EVENT = 'jibi-wishlist-change'

export function readWishlist() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* private mode: keep it for this page only */ }
  window.dispatchEvent(new Event(EVENT))
}

export function toggleWishlist(product, storeSlug) {
  const list = readWishlist()
  if (list.some((x) => x.id === product.id)) {
    write(list.filter((x) => x.id !== product.id))
  } else {
    const image = product.colorVariants?.find((v) => v.imageUrls?.length)?.imageUrls?.[0] || product.imageUrls?.[0] || ''
    write([{ id: product.id, name: product.name, nameHe: product.nameHe, nameAr: product.nameAr, price: product.price, image, storeSlug }, ...list])
  }
}

export function useWishlist() {
  const [list, setList] = useState(readWishlist)
  useEffect(() => {
    const update = () => setList(readWishlist())
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return list
}
