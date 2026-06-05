import { useState } from 'react'

/**
 * Menu burger (drawer coulissant + backdrop).
 * Inspiré du BurgerMenu de Mikaza, adapté à la stack WaterLab
 * (JSX, CSS classique, pas de routeur : chaque item déclenche un callback).
 *
 * @param {{label:string, icon:string, onClick:()=>void}[]} items
 */
export default function BurgerMenu({ items = [] }) {
  const [open, setOpen] = useState(false)

  const handleItem = (onClick) => {
    setOpen(false)
    onClick?.()
  }

  return (
    <>
      <button
        className="burger-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <span className="burger-lines" aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>

      {open && (
        <>
          <div className="burger-backdrop" onClick={() => setOpen(false)} />
          <nav className="burger-panel" role="menu">
            <div className="burger-head">
              <span className="burger-title">Menu</span>
              <button className="burger-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>
            <div className="burger-items">
              {items.map((it, i) => (
                <button
                  key={i}
                  className="burger-item"
                  role="menuitem"
                  onClick={() => handleItem(it.onClick)}
                >
                  <span className="burger-item-icon">{it.icon}</span>
                  <span className="burger-item-label">{it.label}</span>
                  <span className="burger-item-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  )
}
