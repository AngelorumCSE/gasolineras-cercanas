// Búsqueda de gasolineras cerca de un punto con los precios oficiales del Ministerio.
// La usa la función serverless de api/gasolineras.js.
//
// Pasos de una búsqueda:
//   1. Elegir las provincias que tocan el círculo de búsqueda (con lib/provincias.js).
//   2. Descargar las gasolineras de esas provincias (cada una se guarda 10 minutos).
//   3. Quedarse con las que están dentro del radio y cumplen los filtros de marcas.
//   4. Limpiar los datos: números con punto decimal, provincia con mayúscula inicial...
//
// ¿Por qué por provincias? El listado de toda España pesa unos 12 MB y tarda 15-20 s,
// mientras que el de una provincia pesa unos 300 KB y tarda 1-2 s.

import { CARBURANTES } from './carburantes.js'
import { PROVINCIAS } from './provincias.js'

const URL_API =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia'
export const RADIO_MAXIMO_KM = 50
const TIEMPO_MAXIMO_MS = 9000 // si el Ministerio tarda más, esa descarga se da por fallida
const DURACION_CACHE_MS = 10 * 60 * 1000 // 10 minutos (la API actualiza los precios cada media hora)

// Caché en memoria: id de provincia -> { caduca, fecha, lista }.
// Dura mientras la función serverless siga activa en Vercel.
const cache = new Map()

export function vaciarCache() {
  cache.clear()
}

// "36,721722" -> 36.721722 (la API usa coma decimal). Devuelve null si no es un número.
export function aNumero(valor) {
  if (valor == null || valor === '') return null
  const n = Number(String(valor).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Distancia en km entre dos puntos { lat, lon } con la fórmula de Haversine
// (la distancia sobre una esfera del tamaño de la Tierra).
export function distanciaKm(a, b) {
  const R = 6371 // radio de la Tierra en km
  const rad = (grados) => (grados * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Distancia desde un punto hasta el rectángulo de una provincia (0 si está dentro).
// El punto del rectángulo más cercano se obtiene «recortando» las coordenadas del
// punto a los límites del rectángulo.
export function distanciaARectanguloKm(punto, r) {
  const lat = Math.min(Math.max(punto.lat, r.latMin), r.latMax)
  const lon = Math.min(Math.max(punto.lon, r.lonMin), r.lonMax)
  return distanciaKm(punto, { lat, lon })
}

// Ids de las provincias que quedan a menos de radioKm del punto, como ['29', '11'].
export function provinciasCercanas(punto, radioKm) {
  return PROVINCIAS.filter((p) => distanciaARectanguloKm(punto, p) <= radioKm).map((p) => p.id)
}

// "REPSOL, bp" -> ['REPSOL', 'BP']
function listaDeMarcas(texto) {
  return String(texto ?? '')
    .split(',')
    .map((marca) => marca.trim().toUpperCase())
    .filter(Boolean)
}

// ¿El rótulo contiene alguna de las marcas? ("REPSOL AUTOGAS" contiene "REPSOL")
function tieneMarca(rotulo, marcas) {
  return marcas.some((marca) => rotulo.toUpperCase().includes(marca))
}

// "MÁLAGA" -> "Málaga", "BALEARS (ILLES)" -> "Balears (Illes)"
function conMayusculaInicial(texto) {
  return texto.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, separador, letra) => separador + letra.toUpperCase())
}

// Descarga las gasolineras de una provincia, o las saca de la caché si son recientes.
async function descargarProvincia(id) {
  const guardada = cache.get(id)
  if (guardada && guardada.caduca > Date.now()) return guardada

  const respuesta = await fetch(`${URL_API}/${id}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) // corta la espera a los 9 s
  })
  if (!respuesta.ok) throw new Error(`La API respondió con HTTP ${respuesta.status} (provincia ${id})`)
  const json = await respuesta.json()

  const datos = { caduca: Date.now() + DURACION_CACHE_MS, fecha: json.Fecha ?? null, lista: json.ListaEESSPrecio ?? [] }
  cache.set(id, datos)
  return datos
}

// Convierte una gasolinera de la API en un objeto limpio, con los nombres que usa la web.
function limpiar(g, posicion, distancia) {
  const precios = {} // solo los carburantes que vende, por ejemplo { gasolina95: 1.689 }
  for (const c of CARBURANTES) {
    const precio = aNumero(g[c.claveApi])
    if (precio > 0) precios[c.id] = precio
  }
  return {
    id: g.IDEESS,
    marca: g['Rótulo']?.trim() || 'Sin marca',
    direccion: g['Dirección']?.trim() ?? '',
    municipio: g.Municipio?.trim() ?? '',
    provincia: conMayusculaInicial(g.Provincia?.trim() ?? ''),
    horario: g.Horario?.trim() ?? '',
    lat: posicion.lat,
    lon: posicion.lon,
    distanciaKm: Math.round(distancia * 1000) / 1000, // redondeada al metro
    precios
  }
}

// Error con un mensaje que se puede enseñar al usuario: la API del Ministerio no responde.
export class ErrorApiMinisterio extends Error {}

// Busca las gasolineras a menos de radioKm del punto, de la más cercana a la más lejana.
//   marcas:  "REPSOL, BP" para quedarse solo con esas marcas
//   excluir: "SHELL" para quitar esa marca
export async function buscarGasolineras({ lat, lon, radioKm = 10, marcas = '', excluir = '' }) {
  const radio = Math.min(Math.max(radioKm, 0.5), RADIO_MAXIMO_KM)
  const punto = { lat, lon }
  const soloEstas = listaDeMarcas(marcas)
  const quitarEstas = listaDeMarcas(excluir)

  // 1 y 2. Provincias cercanas, descargadas a la vez. «allSettled» espera a todas aunque
  // alguna falle: así se devuelve lo que haya llegado y se avisa de que puede faltar algo.
  const provincias = provinciasCercanas(punto, radio)
  const descargas = await Promise.allSettled(provincias.map(descargarProvincia))
  const correctas = descargas.filter((d) => d.status === 'fulfilled').map((d) => d.value)

  if (provincias.length > 0 && correctas.length === 0) {
    const motivo = descargas[0].reason
    throw new ErrorApiMinisterio(
      motivo?.name === 'TimeoutError'
        ? 'La API del Ministerio no ha respondido a tiempo. Inténtalo de nuevo en unos segundos.'
        : 'La API del Ministerio no está disponible en este momento.',
      { cause: motivo }
    )
  }

  // 3 y 4. Filtrar por distancia y marcas, y limpiar
  const gasolineras = []
  for (const g of correctas.flatMap((d) => d.lista)) {
    const posicion = { lat: aNumero(g.Latitud), lon: aNumero(g['Longitud (WGS84)']) }
    if (posicion.lat === null || posicion.lon === null) continue // sin coordenadas
    const distancia = distanciaKm(punto, posicion)
    if (distancia > radio) continue // fuera del círculo de búsqueda
    const rotulo = g['Rótulo'] ?? ''
    if (soloEstas.length > 0 && !tieneMarca(rotulo, soloEstas)) continue
    if (quitarEstas.length > 0 && tieneMarca(rotulo, quitarEstas)) continue
    gasolineras.push(limpiar(g, posicion, distancia))
  }
  gasolineras.sort((a, b) => a.distanciaKm - b.distanciaKm)

  return {
    fecha: correctas[0]?.fecha ?? null, // cuándo actualizó el Ministerio los precios
    radioKm: radio,
    provincias,
    incompleto: correctas.length < provincias.length, // true si alguna provincia no ha respondido
    gasolineras
  }
}
