import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useWishlist, toggleWishlist } from '../utils/wishlist'
import { productName } from '../utils/productName'
import { sizedImage } from '../utils/image'
import './Home.css'

export default function Wishlist() {
  const { t, lang } = useLanguage()
  const list = useWishlist()

  return (
    <div className="home">
      <div className="shop-section-head">
        <h2>♥ {t('wishlist.title')}</h2>
        <span className="shop-section-count">{t('storePage.productCount').replace('{n}', list.length)}</span>
      </div>
      {list.length === 0 ? (
        <p className="empty">{t('wishlist.empty')} <Link to="/">{t('cart.browseStores')}</Link></p>
      ) : (
        <div className="shop-grid">
          {list.map((p) => {
            const link = `/product/${p.id}${p.storeSlug ? `?store=${encodeURIComponent(p.storeSlug)}` : ''}`
            return (
              <article key={p.id} className="shop-card">
                <Link to={link} className="shop-card-media">
                  {p.image ? <img src={sizedImage(p.image, 480)} alt={productName(p, lang)} loading="lazy" /> : <div className="shop-card-placeholder">{t('storePage.noImage')}</div>}
                  <button type="button" className="wish-heart is-saved" aria-label={t('wishlist.remove')}
                    onClick={(e) => { e.preventDefault(); toggleWishlist(p) }}>♥</button>
                </Link>
                <div className="shop-card-body">
                  <Link to={link} className="shop-card-name">{productName(p, lang)}</Link>
                  <div className="shop-card-bottom">
                    <span className="shop-card-price">{p.price != null ? `₪${Number(p.price).toFixed(2)}` : ''}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
