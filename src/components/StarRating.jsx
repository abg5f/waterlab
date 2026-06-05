export default function StarRating({ score, size = 'md' }) {
  return (
    <div className={`stars stars-${size}`} aria-label={`${score} étoile${score > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= score ? 'star star-on' : 'star star-off'}>★</span>
      ))}
    </div>
  )
}
