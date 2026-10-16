// Función serverless (Vercel) que hace de intermediaria con la API REST de precios de
// carburantes del Ministerio, que no permite CORS y no se puede llamar desde el navegador.
// La lógica de búsqueda está en lib/estaciones.js; aquí solo se trata la petición HTTP.
//
// GET /api/EstacionesTerrestres?lat=36.7213&lon=-4.4214&radiusKm=10
//     [&includeBrands=REPSOL,BP] [&excludeBrands=SHELL]

import { buscarEstaciones, ErrorApiMinisterio, toNumber } from '../lib/estaciones.js'

function leerParametros(req) {
  const query = req.query ?? Object.fromEntries(new URL(req.url || '/', 'http://localhost').searchParams)
  const primero = (v) => (Array.isArray(v) ? v[0] : v)
  return Object.fromEntries(Object.entries(query).map(([k, v]) => [k, primero(v)]))
}

function responder(res, status, cuerpo, cacheControl = 'no-store') {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
  res.end(JSON.stringify(cuerpo))
}

export default async function handler(req, res) {
  const q = leerParametros(req)
  const lat = toNumber(q.lat)
  const lon = toNumber(q.lon)
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    responder(res, 400, { error: 'Indica una latitud y una longitud válidas (parámetros lat y lon).' })
    return
  }

  try {
    const resultado = await buscarEstaciones({
      lat,
      lon,
      radiusKm: toNumber(q.radiusKm) ?? 10,
      includeBrands: q.includeBrands,
      excludeBrands: q.excludeBrands
    })
    // La CDN de Vercel puede reutilizar la respuesta 5 minutos para la misma consulta.
    responder(res, 200, resultado, 'public, s-maxage=300, stale-while-revalidate=600')
  } catch (e) {
    console.error(e) // visible en los registros (Logs) de Vercel
    if (e instanceof ErrorApiMinisterio) {
      responder(res, 502, { error: e.message })
    } else {
      responder(res, 500, { error: 'Error interno al procesar la consulta.' })
    }
  }
}
