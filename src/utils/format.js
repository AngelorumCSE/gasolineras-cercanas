const priceFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const eurosFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const kmFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

export const formatPrice = (price) => `${priceFormat.format(price)} €/L`
export const formatEuros = (amount) => eurosFormat.format(amount)

export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${kmFormat.format(km)} km`
}

// "15/10/2026 19:42:25" (formato de la API) -> "15/10/2026 a las 19:42"
export function formatApiDate(fecha) {
  const m = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/.exec(fecha || '')
  return m ? `${m[1]} a las ${m[2]}` : null
}

// Enlace oficial de Google Maps para abrir la ruta hasta un punto.
export function directionsUrl(lat, lon) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}
