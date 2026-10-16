// Pruebas de lib/estaciones.js con una API simulada (no se conecta a Internet).
import { afterEach, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarEstaciones,
  distanciaARectanguloKm,
  ErrorApiMinisterio,
  provinciasCercanas,
  vaciarCache
} from '../lib/estaciones.js'

const MALAGA = { lat: 36.7213, lon: -4.4214 }

function estacion(id, rotulo, lat, lon, precio95) {
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
    'Precio Hidrogeno': '',
    'C.P.': '29001'
  }
}

const LISTADO_MALAGA = [
  estacion('1', 'REPSOL', 36.7220, -4.4200, '1,659'), // a unos 150 m
  estacion('2', 'BP', 36.7400, -4.4214, '1,629'), // a unos 2 km
  estacion('3', 'PLENOIL', 36.8213, -4.4214, '1,499') // a unos 11 km
]

let llamadas = []
const fetchOriginal = globalThis.fetch

function simularApi(respuestas) {
  globalThis.fetch = async (url) => {
    llamadas.push(url)
    const id = url.split('/').pop()
    const r = respuestas[id] ?? { status: 200, json: { Fecha: '15/10/2026 19:00:00', ListaEESSPrecio: [] } }
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

describe('buscarEstaciones', () => {
  test('filtra por radio, ordena por distancia y recorta los campos', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: '15/10/2026 19:00:00', ListaEESSPrecio: LISTADO_MALAGA } } })
    const r = await buscarEstaciones({ ...MALAGA, radiusKm: 5 })

    assert.equal(r.Fecha, '15/10/2026 19:00:00')
    assert.equal(r.incompleto, false)
    assert.deepEqual(r.ListaEESSPrecio.map((s) => s.IDEESS), ['1', '2'])
    assert.equal(r.ListaEESSPrecio[0]['Precio Gasolina 95 E5'], '1,659')
    assert.equal('Precio Hidrogeno' in r.ListaEESSPrecio[0], false) // precios vacíos fuera
    assert.equal('C.P.' in r.ListaEESSPrecio[0], false) // campos que no se usan fuera
  })

  test('aplica la lista de marcas incluidas y excluidas', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } } })
    const solo = await buscarEstaciones({ ...MALAGA, radiusKm: 20, includeBrands: 'bp, plenoil' })
    assert.deepEqual(solo.ListaEESSPrecio.map((s) => s.IDEESS), ['2', '3'])
    const sin = await buscarEstaciones({ ...MALAGA, radiusKm: 20, excludeBrands: 'REPSOL' })
    assert.deepEqual(sin.ListaEESSPrecio.map((s) => s.IDEESS), ['2', '3'])
  })

  test('limita el radio a 50 km', async () => {
    simularApi({})
    const r = await buscarEstaciones({ ...MALAGA, radiusKm: 500 })
    assert.equal(r.radiusKm, 50)
  })

  test('reutiliza la caché y no repite la descarga', async () => {
    simularApi({ 29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } } })
    await buscarEstaciones({ ...MALAGA, radiusKm: 5 })
    const primeras = llamadas.length
    await buscarEstaciones({ ...MALAGA, radiusKm: 5 })
    assert.equal(llamadas.length, primeras)
  })

  test('si falla alguna provincia devuelve el resto y lo indica', async () => {
    const provincias = provinciasCercanas(MALAGA, 10)
    assert.ok(provincias.length >= 2)
    const otra = provincias.find((id) => id !== '29')
    simularApi({
      29: { status: 200, json: { Fecha: 'x', ListaEESSPrecio: LISTADO_MALAGA } },
      [otra]: { status: 503 }
    })
    const r = await buscarEstaciones({ ...MALAGA, radiusKm: 10 })
    assert.equal(r.incompleto, true)
    assert.equal(r.ListaEESSPrecio.length, 2)
  })

  test('si fallan todas las provincias lanza ErrorApiMinisterio', async () => {
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(buscarEstaciones({ ...MALAGA, radiusKm: 10 }), ErrorApiMinisterio)
  })
})
