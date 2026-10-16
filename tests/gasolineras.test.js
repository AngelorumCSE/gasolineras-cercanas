// Pruebas de lib/gasolineras.js con una API del Ministerio simulada (sin conexión a Internet).
import { afterEach, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarGasolineras,
  distanciaARectanguloKm,
  ErrorApiMinisterio,
  provinciasCercanas,
  vaciarCache
} from '../lib/gasolineras.js'

const MALAGA = { lat: 36.7213, lon: -4.4214 }

// Una gasolinera tal y como la devuelve la API (con coma decimal y claves con tilde)
function gasolineraDeLaApi(id, rotulo, lat, lon, precio95) {
  return {
    IDEESS: id,
    'Rótulo': rotulo,
    'Dirección': `CALLE ${id}`,
    Municipio: 'Málaga',
    Provincia: 'MÁLAGA',
    Horario: 'L-D: 24H',
    Latitud: String(lat).replace('.', ','),
    'Longitud (WGS84)': String(lon).replace('.', ','),
    'Precio Gasolina 95 E5': precio95,
    'Precio Gasoleo A': '',
    'C.P.': '29001'
  }
}

const LISTADO_MALAGA = [
  gasolineraDeLaApi('1', 'REPSOL', 36.722, -4.42, '1,659'), // a unos 150 m
  gasolineraDeLaApi('2', 'BP', 36.74, -4.4214, '1,629'), // a unos 2 km
  gasolineraDeLaApi('3', 'PLENOIL', 36.8213, -4.4214, '1,499') // a unos 11 km
]

// URLs que ha recibido la API simulada y el fetch de verdad, para restaurarlo al acabar
let llamadas = []
const fetchOriginal = globalThis.fetch

// Sustituye fetch por una función que responde según el id de provincia de la URL
function simularApi(respuestas) {
  globalThis.fetch = async (url) => {
    llamadas.push(url)
    const id = url.split('/').pop()
    const r = respuestas[id] ?? { status: 200, json: { Fecha: '16/10/2026 16:00:00', ListaEESSPrecio: [] } }
    return new Response(JSON.stringify(r.json ?? {}), { status: r.status })
  }
}

beforeEach(() => {
  llamadas = []
  vaciarCache()
})

afterEach(() => {
  globalThis.fetch = fetchOriginal
})

describe('provincias', () => {
  test('la distancia a un rectángulo es 0 si el punto está dentro', () => {
    const r = { latMin: 36, latMax: 37, lonMin: -5, lonMax: -4 }
    assert.equal(distanciaARectanguloKm({ lat: 36.5, lon: -4.5 }, r), 0)
    assert.ok(distanciaARectanguloKm({ lat: 38, lon: -4.5 }, r) > 100)
  })

  test('Málaga capital a 10 km incluye la provincia 29', () => {
    assert.ok(provinciasCercanas(MALAGA, 10).includes('29'))
  })

  test('un punto en mitad del océano no toca ninguna provincia', () => {
    assert.deepEqual(provinciasCercanas({ lat: 38, lon: -12 }, 10), [])
  })
})

describe('buscarGasolineras', () => {
  test('filtra por radio y ordena de la más cercana a la más lejana', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: '16/10/2026 16:00:00', ListaEESSPrecio: LISTADO_MALAGA } } })
    const r = await buscarGasolineras({ ...MALAGA, radioKm: 5 })
    assert.equal(r.fecha, '16/10/2026 16:00:00')
    assert.equal(r.incompleto, false)
    assert.deepEqual(r.gasolineras.map((g) => g.id), ['1', '2'])
    assert.ok(r.gasolineras[0].distanciaKm < r.gasolineras[1].distanciaKm)
  })

  test('limpia los datos: números con punto, dirección con tilde y provincia con mayúscula inicial', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } } })
    const [g] = (await buscarGasolineras({ ...MALAGA, radioKm: 1 })).gasolineras
    assert.equal(g.marca, 'REPSOL')
    assert.equal(g.direccion, 'CALLE 1')
    assert.equal(g.provincia, 'Málaga')
    assert.equal(g.lat, 36.722)
    assert.deepEqual(g.precios, { gasolina95: 1.659 }) // el gasóleo sin precio no aparece
  })

  test('aplica las marcas incluidas y las excluidas', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } } })
    const solo = await buscarGasolineras({ ...MALAGA, radioKm: 20, marcas: 'bp, plenoil' })
    assert.deepEqual(solo.gasolineras.map((g) => g.id), ['2', '3'])
    const sin = await buscarGasolineras({ ...MALAGA, radioKm: 20, excluir: 'REPSOL' })
    assert.deepEqual(sin.gasolineras.map((g) => g.id), ['2', '3'])
  })

  test('limita el radio a 50 km', async () => {
    simularApi({})
    const r = await buscarGasolineras({ ...MALAGA, radioKm: 500 })
    assert.equal(r.radioKm, 50)
  })

  test('usa la caché y no repite la descarga', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } } })
    await buscarGasolineras({ ...MALAGA, radioKm: 5 })
    const primeras = llamadas.length
    await buscarGasolineras({ ...MALAGA, radioKm: 5 })
    assert.equal(llamadas.length, primeras)
  })

  test('si falla alguna provincia, devuelve el resto y lo indica', async () => {
    const provincias = provinciasCercanas(MALAGA, 10)
    assert.ok(provincias.length >= 2)
    const otra = provincias.find((id) => id !== '29')
    simularApi({
      29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } },
      [otra]: { status: 503 }
    })
    const r = await buscarGasolineras({ ...MALAGA, radioKm: 10 })
    assert.equal(r.incompleto, true)
    assert.equal(r.gasolineras.length, 2)
  })

  test('si fallan todas las provincias, lanza ErrorApiMinisterio', async () => {
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(buscarGasolineras({ ...MALAGA, radioKm: 10 }), ErrorApiMinisterio)
  })
})
