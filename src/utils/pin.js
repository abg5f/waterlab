/* Utilitaire partagé pour la protection par mot de passe */
const PIN_KEY = 'wl_api_pin'

export function encodePin(pin) {
  return btoa(encodeURIComponent(pin.trim()))
}
export function checkPin(input) {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return true  // pas de PIN = accès libre
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
