/** Pack label → kg, e.g. 250G → 0.25, 2KG → 2 */
export function packWeightKg(size) {
  if (size == null || typeof size !== 'string') return null
  const s = size.trim().toUpperCase()
  const kgMatch = s.match(/^(\d+(?:\.\d+)?)KG$/)
  if (kgMatch) return Number(kgMatch[1])
  const gMatch = s.match(/^(\d+(?:\.\d+)?)G$/)
  if (gMatch) return Number(gMatch[1]) / 1000
  return null
}

export function usesWeightPricing(storeCategory) {
  return storeCategory === 'SPICES' || storeCategory === 'GROCERY'
}

/** For weight stores, `product.price` is per 1 kg; returns price for one pack at `size`. */
export function lineUnitPrice(product, size) {
  const base = Number(product?.price)
  if (Number.isNaN(base)) return 0
  if (!usesWeightPricing(product?.storeCategory)) return base
  const kg = packWeightKg(size)
  if (kg == null) return base
  return base * kg
}
