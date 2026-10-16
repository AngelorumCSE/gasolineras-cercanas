// Pide las gasolineras a nuestra función serverless (/api/gasolineras).
// Si algo falla, lanza un Error con un mensaje que se puede enseñar al usuario.

const TIEMPO_MAXIMO_MS = 25000

export async function pedirGasolineras({ lat, lon, radioKm, marcas, excluir }) {
  const parametros = new URLSearchParams({ lat, lon, radio: radioKm })
  if (marcas.trim()) parametros.set('marcas', marcas.trim())
  if (excluir.trim()) parametros.set('excluir', excluir.trim())

  let respuesta
  try {
    respuesta = await fetch(`/api/gasolineras?${parametros}`, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) })
  } catch (error) {
    // No ha llegado respuesta: o ha tardado demasiado o no hay conexión
    throw new Error(
      error.name === 'TimeoutError'
        ? 'La consulta está tardando demasiado. Inténtalo de nuevo en unos segundos.'
        : 'No se ha podido conectar con el servidor. Comprueba tu conexión.'
    )
  }

  const datos = await respuesta.json().catch(() => null) // null si la respuesta no es JSON
  if (!respuesta.ok) {
    throw new Error(datos?.error ?? `Error HTTP ${respuesta.status} al consultar las gasolineras.`)
  }
  return datos // { fecha, radioKm, provincias, incompleto, gasolineras }
}
