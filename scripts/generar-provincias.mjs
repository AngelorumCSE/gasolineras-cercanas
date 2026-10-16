// Genera lib/provincias.js: el rectángulo (latitud y longitud mínimas y máximas) que
// ocupan las gasolineras de cada provincia según el listado nacional del Ministerio.
// La función serverless lo usa para descargar solo las provincias que tocan el radio
// de búsqueda en lugar del listado completo de España (unos 12 MB).
//
// Uso:
//   npm run provincias                               (descarga el listado nacional)
//   node scripts/generar-provincias.mjs listado.json (usa un listado ya descargado)

import { readFile, writeFile } from 'node:fs/promises'

const URL_NACIONAL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/'

// Margen de unos 5 km por si abre una gasolinera junto al límite de una provincia.
const MARGEN_GRADOS = 0.05

// Extensión aproximada de España (Península, Baleares, Canarias, Ceuta y Melilla).
// Sirve para descartar coordenadas erróneas del listado, como (0, 0) o latitud y
// longitud intercambiadas, que agrandarían el rectángulo de su provincia.
const ESPANA = { latMin: 27.4, latMax: 44.0, lonMin: -18.4, lonMax: 4.6 }

function aNumero(valor) {
  const n = Number(String(valor ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function leerListado(ruta) {
  if (ruta) return JSON.parse(await readFile(ruta, 'utf8'))
  const respuesta = await fetch(URL_NACIONAL, { headers: { Accept: 'application/json' } })
  if (!respuesta.ok) throw new Error(`La API respondió con HTTP ${respuesta.status}`)
  return respuesta.json()
}

const datos = await leerListado(process.argv[2])
const provincias = new Map()
let descartadas = 0

for (const estacion of datos.ListaEESSPrecio) {
  const lat = aNumero(estacion.Latitud)
  const lon = aNumero(estacion['Longitud (WGS84)'])
  const dentro =
    lat !== null && lon !== null &&
    lat >= ESPANA.latMin && lat <= ESPANA.latMax &&
    lon >= ESPANA.lonMin && lon <= ESPANA.lonMax
  if (!dentro) {
    descartadas++
    continue
  }

  const id = estacion.IDProvincia
  const p = provincias.get(id) ?? {
    id, nombre: estacion.Provincia, latMin: 90, latMax: -90, lonMin: 180, lonMax: -180
  }
  p.latMin = Math.min(p.latMin, lat)
  p.latMax = Math.max(p.latMax, lat)
  p.lonMin = Math.min(p.lonMin, lon)
  p.lonMax = Math.max(p.lonMax, lon)
  provincias.set(id, p)
}

// Se redondea hacia fuera para que el rectángulo nunca quede más pequeño.
const abajo = (x) => Math.floor((x - MARGEN_GRADOS) * 100) / 100
const arriba = (x) => Math.ceil((x + MARGEN_GRADOS) * 100) / 100

const filas = [...provincias.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((p) =>
    `  { id: '${p.id}', nombre: '${p.nombre.replaceAll("'", "\\'")}', ` +
    `latMin: ${abajo(p.latMin)}, latMax: ${arriba(p.latMax)}, ` +
    `lonMin: ${abajo(p.lonMin)}, lonMax: ${arriba(p.lonMax)} },`
  )

const contenido = `// Archivo generado con «npm run provincias» a partir del listado del ${datos.Fecha}.
// Rectángulo que ocupan las gasolineras de cada provincia (con un margen de unos 5 km).
export const PROVINCIAS = [
${filas.join('\n')}
]
`

await writeFile(new URL('../lib/provincias.js', import.meta.url), contenido)
console.log(`${filas.length} provincias guardadas en lib/provincias.js`)
console.log(`${descartadas} gasolineras descartadas por coordenadas fuera de España`)
