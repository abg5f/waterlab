import { useState } from 'react'

/**
 * Galerie de miniatures + visionneuse plein écran (lightbox).
 * Accepte soit des objets { url, path } (format stocké), soit des URLs brutes.
 */
export default function PhotoGallery({ photos, size = 'md' }) {
  const [open, setOpen] = useState(null)

  if (!photos?.length) return null

  const urlOf = p => (typeof p === 'string' ? p : p?.url)

  return (
    <>
      <div className={`photo-gallery photo-gallery-${size}`}>
        {photos.map((p, i) => (
          <button
            key={p?.path || urlOf(p) || i}
            type="button"
            className="photo-thumb"
            onClick={() => setOpen(i)}
          >
            <img src={urlOf(p)} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {open != null && (
        <div className="photo-lightbox-bg" onClick={() => setOpen(null)}>
          <button className="photo-lightbox-close" onClick={() => setOpen(null)}>✕</button>
          {photos.length > 1 && (
            <button
              className="photo-lightbox-nav photo-lightbox-prev"
              onClick={e => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length) }}
            >‹</button>
          )}
          <img
            className="photo-lightbox-img"
            src={urlOf(photos[open])}
            alt=""
            onClick={e => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <button
              className="photo-lightbox-nav photo-lightbox-next"
              onClick={e => { e.stopPropagation(); setOpen((open + 1) % photos.length) }}
            >›</button>
          )}
        </div>
      )}
    </>
  )
}
