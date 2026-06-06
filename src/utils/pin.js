/* Utilitaire partagé pour la protection par mot de passe */
const PIN_KEY = 'wl_api_pin'
const DEFAULT_PIN = '0000'  // mot de passe par défaut tant qu'aucun n'est défini

export function encodePin(pin) {
  return btoa(encodeURIComponent(pin.trim()))
}
export function checkPin(input) {
  const stored = localStorage.getItem(PIN_KEY)
  // Aucun mot de passe personnalisé → on exige le mot de passe par défaut (0000)
  if (!stored) return input.trim() === DEFAULT_PIN
  return encodePin(input) === stored
}
export function savePin(pin) {
  localStorage.setItem(PIN_KEY, encodePin(pin))
}
export function hasPinStored() {
  return !!localStorage.getItem(PIN_KEY)
}
export function removePin() {
  localStorage.removeItem(PIN_KEY)
}
