// Lógica de búsqueda de gasolineras que usa la función serverless de /api.
// La API REST del Ministerio devuelve las gasolineras de una provincia en 1-2 s
// (unos 300 KB), mientras que el listado de toda España pesa unos 12 MB y tarda
// 15-20 s. Por eso solo se piden las provincias que tocan el radio de búsqueda.

import { PROVINCIAS } from './provincias.js'

const API_BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes'
export const RADIO_MAXIMO_KM = 50
const TIEMPO_MAXIMO_MS = 9000
// La API actualiza los precios cada media hora; 10 minutos de caché en memoria evita
// repetir descargas mientras la instancia de la función siga activa.
const CACHE_MS = 10 * 60 * 1000
const cache = new Map() // idProvincia -> { caduca, fecha, lista }

// Campos que se devuelven de cada gasolinera, además de todos los precios con valor.
const CAMPOS = ['IDEESS', 'Rótulo', 'Dirección', 'Municipio', 'Provincia', 'Horario', 'Latitud', 'Longitud (WGS84)']

export function vaciarCache() {
  cache.clear()
}

export function toNumber(value) {
  if (value == null || value === '') return null
  const n = Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function haversineKm(a, b) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Distancia desde un punto hasta el rectángulo de una provincia (0 si está dentro).
export function distanciaARectanguloKm(punto, r) {
  const lat = Math.min(Math.max(punto.lat, r.latMin), r.latMax)
  const lon = Math.min(Math.max(punto.lon, r.lonMin), r.lonMax)
  return haversineKm(punto, { lat, lon })
}

export function provinciasCercanas(punto, radioKm) {
  return PROVINCIAS.filter((p) => distanciaARectanguloKm(punto, p) <= radioKm).map((p) => p.id)
}

function normalizeList(str) {
  if (!str) return []
  return String(str)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function brandMatches(brand, items) {
  const b = (brand || '').toUpperCase()
  return items.some((i) => b.includes(i))
}

function recortar(estacion) {
  const salida = {}
  for (const campo of CAMPOS) salida[campo] = estacion[campo] ?? ''
  for (const [campo, valor] of Object.entries(estacion)) {
    if (campo.startsWith('Precio ') && valor) salida[campo] = valor
  }
  return salida
}

async function descargarProvincia(id) {
  const guardada = cache.get(id)
  if (guardada && guardada.caduca > Date.now()) return guardada

  const respuesta = await fetch(`${API_BASE}/EstacionesTerrestres/FiltroProvincia/${id}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'gasolineras-cercanas/1.0' },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
  })
  if (!respuesta.ok) throw new Error(`La API respondió con HTTP ${respuesta.status} (provincia ${id})`)

  const json = await respuesta.json()
  const datos = {
    caduca: Date.now() + CACHE_MS,
    fecha: json.Fecha || null,
    lista: Array.isArray(json.ListaEESSPrecio) ? json.ListaEESSPrecio : []
  }
  cache.set(id, datos)
  return datos
}

export class ErrorApiMinisterio extends Error {}

// Devuelve las gasolineras a menos de radiusKm del punto, ordenadas por distancia.
export async function buscarEstaciones({ lat, lon, radiusKm = 10, includeBrands = '', excludeBrands = '' }) {
  const radio = Math.min(Math.max(radiusKm, 0.5), RADIO_MAXIMO_KM)
  const incluir = normalizeList(includeBrands)
  const excluir = normalizeList(excludeBrands)
  const origen = { lat, lon }

  const provincias = provinciasCercanas(origen, radio)
  const descargas = await Promise.allSettled(provincias.map(descargarProvincia))
  const correctas = descargas.filter((d) => d.status === 'fulfilled').map((d) => d.value)

  if (provincias.length && !correctas.length) {
    const motivo = descargas[0].reason
    throw new ErrorApiMinisterio(
      motivo?.name === 'TimeoutError'
        ? 'La API del Ministerio no ha respondido a tiempo. Inténtalo de nuevo en unos segundos.'
        : 'La API del Ministerio no está disponible en este momento.',
      { cause: motivo }
    )
  }

  const estaciones = correctas
    .flatMap((d) => d.lista)
    .map((s) => {
      const sLat = toNumber(s.Latitud)
      const sLon = toNumber(s['Longitud (WGS84)'])
      if (sLat === null || sLon === null) return null
      return { s, dist: haversineKm(origen, { lat: sLat, lon: sLon }) }
    })
    .filter((x) => x && x.dist <= radio)
    .filter(({ s }) => {
      const brand = String(s['Rótulo'] || '')
      if (incluir.length && !brandMatches(brand, incluir)) return false
      if (excluir.length && brandMatches(brand, excluir)) return false
      return true
    })
    .sort((a, b) => a.dist - b.dist)
    .map(({ s }) => recortar(s))

  return {
    Fecha: correctas[0]?.fecha ?? null,
    radiusKm: radio,
    provincias,
    incompleto: correctas.length < provincias.length,
    ListaEESSPrecio: estaciones
  }
}
