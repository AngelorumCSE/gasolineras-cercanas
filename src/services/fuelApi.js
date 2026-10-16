// Cliente de la función serverless /api/EstacionesTerrestres (ver api/ y lib/).
// En desarrollo, vite.config.js atiende esa ruta con la misma función que usa Vercel.

// Claves tal y como aparecen en la API del Ministerio.
export const FUEL_OPTIONS = [
  { key: 'Precio Gasolina 95 E5', label: 'Gasolina 95 E5' },
  { key: 'Precio Gasolina 98 E5', label: 'Gasolina 98 E5' },
  { key: 'Precio Gasoleo A', label: 'Gasóleo A' },
  { key: 'Precio Gasoleo Premium', label: 'Gasóleo Premium' },
  { key: 'Precio Gasoleo B', label: 'Gasóleo B (agrícola)' },
  { key: 'Precio Gases licuados del petróleo', label: 'GLP (autogás)' },
  { key: 'Precio Gas Natural Comprimido', label: 'Gas natural comprimido (GNC)' },
  { key: 'Precio Gas Natural Licuado', label: 'Gas natural licuado (GNL)' }
]

export function fuelLabel(key) {
  return FUEL_OPTIONS.find((o) => o.key === key)?.label ?? key
}

const TIEMPO_MAXIMO_MS = 25000

export async function fetchStations({ lat, lon, radiusKm, includeBrands, excludeBrands }) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radiusKm: String(radiusKm) })
  if (includeBrands?.trim()) params.set('includeBrands', includeBrands.trim())
  if (excludeBrands?.trim()) params.set('excludeBrands', excludeBrands.trim())

  let res
  try {
    res = await fetch(`/api/EstacionesTerrestres?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
    })
  } catch (e) {
    throw new Error(
      e?.name === 'TimeoutError'
        ? 'La consulta está tardando demasiado. Inténtalo de nuevo en unos segundos.'
        : 'No se ha podido conectar con el servidor. Comprueba tu conexión.'
    )
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `Error HTTP ${res.status} al consultar las gasolineras.`)
  }
  if (!Array.isArray(data?.ListaEESSPrecio)) {
    throw new Error('Formato inesperado en la respuesta del servidor.')
  }

  return {
    stations: data.ListaEESSPrecio,
    fecha: data.Fecha || null,
    incompleto: Boolean(data.incompleto)
  }
}
