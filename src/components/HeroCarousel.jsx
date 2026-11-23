import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Home banner: a few slides that change every 5 seconds; each slide has its own photo, text and link.
export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || slides.length < 2) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  if (!slides.length) return null
  const current = index % slides.length

  return (
    <section className="hero2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, i) => (
        <div key={s.key} className={`hero2-slide hero2-${s.tone || 'cream'} ${i === current ? 'is-active' : ''}`} aria-hidden={i !== current}>
          <div className="hero2-copy">
            {s.eyebrow && <small>{s.eyebrow}</small>}
            <h1>{s.title}</h1>
            {s.text && <p>{s.text}</p>}
            {s.to && <Link to={s.to} className="hero2-btn" tabIndex={i === current ? 0 : -1}>{s.cta}</Link>}
          </div>
          <div className="hero2-images">
            {s.images.map((src) => <img key={src} src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} />)}
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="hero2-dots">
          {slides.map((s, i) => (
            <button key={s.key} type="button" className={i === current ? 'is-active' : ''} aria-label={`${i + 1}`} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </section>
  )
}
