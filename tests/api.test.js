// Pruebas de la función serverless (api/gasolineras.js) con peticiones y respuestas simuladas.
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/gasolineras.js'
import { vaciarCache } from '../lib/gasolineras.js'

const fetchOriginal = globalThis.fetch

afterEach(() => {
  globalThis.fetch = fetchOriginal
  vaciarCache()
})

// Llama a la función como lo haría Vercel y devuelve el código, las cabeceras y el JSON
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
  const r = await llamar('/api/gasolineras?lat=abc')
  assert.equal(r.status, 400)
  assert.match(r.json.error, /latitud/)
  assert.equal(r.headers['cache-control'], 'no-store')
})

test('responde 200 con la lista y deja que la CDN la guarde 5 minutos', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ Fecha: '16/10/2026 16:00:00', ListaEESSPrecio: [] }), { status: 200 })
  const r = await llamar('/api/gasolineras?lat=36.7213&lon=-4.4214&radio=5')
  assert.equal(r.status, 200)
  assert.equal(r.json.radioKm, 5)
  assert.deepEqual(r.json.gasolineras, [])
  assert.match(r.headers['cache-control'], /s-maxage=300/)
})

test('responde 502 si la API del Ministerio no está disponible', async (t) => {
  t.mock.method(console, 'error', () => {}) // el error se registra, pero no ensucia la salida de las pruebas
  globalThis.fetch = async () => new Response('', { status: 503 })
  const r = await llamar('/api/gasolineras?lat=36.7213&lon=-4.4214')
  assert.equal(r.status, 502)
  assert.match(r.json.error, /Ministerio/)
})
