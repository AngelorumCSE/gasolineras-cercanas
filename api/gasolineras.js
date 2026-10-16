// Función serverless de Vercel: la web la llama en /api/gasolineras.
//
// Hace de intermediaria con la API de precios del Ministerio, que no se puede llamar
// desde el navegador porque no permite CORS. Aquí solo se leen y comprueban los
// parámetros de la petición; la búsqueda está en lib/gasolineras.js.
//
// Ejemplo: /api/gasolineras?lat=36.7213&lon=-4.4214&radio=10&marcas=REPSOL,BP&excluir=SHELL

import { aNumero, buscarGasolineras, ErrorApiMinisterio } from '../lib/gasolineras.js'

// Envía una respuesta en JSON con el código HTTP indicado.
function responder(res, codigo, cuerpo, cache = 'no-store') {
  res.statusCode = codigo
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cache)
  res.end(JSON.stringify(cuerpo))
}

// Atiende cada petición: lee lat, lon, radio, marcas y excluir, busca las gasolineras y responde en JSON.
export default async function handler(req, res) {
  // Parámetros de la URL. Vercel los da ya leídos en req.query; en local (vite.config.js)
  // se sacan de la propia URL.
  const parametros = req.query ?? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
  const lat = aNumero(parametros.lat)
  const lon = aNumero(parametros.lon)
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    responder(res, 400, { error: 'Indica una latitud y una longitud válidas (parámetros lat y lon).' })
    return
  }

  try {
    const resultado = await buscarGasolineras({
      lat,
      lon,
      radioKm: aNumero(parametros.radio) ?? 10,
      marcas: parametros.marcas,
      excluir: parametros.excluir
    })
    // La CDN de Vercel puede reutilizar esta respuesta durante 5 minutos para la misma URL.
    responder(res, 200, resultado, 'public, s-maxage=300, stale-while-revalidate=600')
  } catch (error) {
    console.error(error) // aparece en los registros (Logs) de Vercel
    if (error instanceof ErrorApiMinisterio) {
      responder(res, 502, { error: error.message }) // 502: falla el servicio del que dependemos
    } else {
      responder(res, 500, { error: 'Error interno al procesar la consulta.' })
    }
  }
}
