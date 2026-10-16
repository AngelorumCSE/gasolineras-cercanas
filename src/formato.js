// Funciones para enseñar precios, distancias y fechas en formato español.

const PRECIO = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const EUROS = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const KM = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

// 1.689 -> "1,689 €/L"
export function formatearPrecio(precio) {
  return `${PRECIO.format(precio)} €/L`
}

// 11.5 -> "11,50 €"
export function formatearEuros(cantidad) {
  return EUROS.format(cantidad)
}

// 0.35 -> "350 m"; 4.27 -> "4,3 km"
export function formatearDistancia(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${KM.format(km)} km`
}

// "16/10/2026 16:46:00" (como lo da la API) -> "16/10/2026 a las 16:46"
export function formatearFecha(fecha) {
  const partes = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/.exec(fecha ?? '')
  return partes ? `${partes[1]} a las ${partes[2]}` : null
}

// Enlace de Google Maps que abre la ruta hasta un punto.
export function enlaceRuta(lat, lon) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
}
