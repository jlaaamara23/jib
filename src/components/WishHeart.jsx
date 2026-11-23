import { toggleWishlist, useWishlist } from '../utils/wishlist'
import { useLanguage } from '../context/LanguageContext'

// Heart button on a product photo; adds or removes the product from the wishlist.
export default function WishHeart({ product, storeSlug }) {
  const { t } = useLanguage()
  const saved = useWishlist().some((x) => x.id === product.id)
  return (
    <button
      type="button"
      className={`wish-heart ${saved ? 'is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? t('wishlist.remove') : t('wishlist.add')}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWishlist(product, storeSlug)
      }}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
