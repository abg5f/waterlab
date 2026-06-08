/**
 * Redimensionne et compresse une image côté client avant envoi vers le
 * stockage (évite les photos de plusieurs Mo prises au téléphone).
 *
 * @param {File}   file     Fichier image sélectionné par l'utilisateur
 * @param {number} maxDim   Dimension max (largeur ou hauteur) en pixels
 * @param {number} quality  Qualité JPEG (0–1)
 * @returns {Promise<Blob>} Blob JPEG redimensionné
 */
export function resizeImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
        else                { width  = Math.round(width  * maxDim / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        blob ? resolve(blob) : reject(new Error('Conversion impossible'))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}

export const MAX_SESSION_PHOTOS = 5
