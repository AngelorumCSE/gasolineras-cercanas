// Pruebas de la capa HTTP de la función serverless con peticiones simuladas.
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/EstacionesTerrestres.js'
import { vaciarCache } from '../lib/estaciones.js'

const fetchOriginal = globalThis.fetch

afterEach(() => {
  globalThis.fetch = fetchOriginal
  vaciarCache()
})

async function llamar(url) {
  const res = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(nombre, valor) {
      this.headers[nombre.toLowerCase()] = valor
    },
    end(cuerpo) {
      this.body = cuerpo
    }
  }
  await handler({ url }, res)
  return { status: res.statusCode, headers: res.headers, json: JSON.parse(res.body) }
}

test('responde 400 si faltan las coordenadas', async () => {
  const r = await llamar('/api/EstacionesTerrestres?lat=abc')
  assert.equal(r.status, 400)
  assert.match(r.json.error, /latitud/)
  assert.equal(r.headers['cache-control'], 'no-store')
})

test('responde 200 con la lista y permite cachear en la CDN', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ Fecha: '15/10/2026 19:00:00', ListaEESSPrecio: [] }), { status: 200 })
  const r = await llamar('/api/EstacionesTerrestres?lat=36.7213&lon=-4.4214&radiusKm=5')
  assert.equal(r.status, 200)
  assert.deepEqual(r.json.ListaEESSPrecio, [])
  assert.match(r.headers['cache-control'], /s-maxage=300/)
})

test('responde 502 si la API del Ministerio no está disponible', async (t) => {
  t.mock.method(console, 'error', () => {}) // el error se registra, pero no ensucia la salida
  globalThis.fetch = async () => new Response('', { status: 503 })
  const r = await llamar('/api/EstacionesTerrestres?lat=36.7213&lon=-4.4214')
  assert.equal(r.status, 502)
  assert.match(r.json.error, /Ministerio/)
})
