// Pruebas de la normalización y la ordenación que hace el frontend.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStation } from '../src/utils/normalize.js'
import { filterAndRankStations, summarizeStations } from '../src/utils/ranking.js'

const ORIGEN = { lat: 36.7213, lon: -4.4214 }
const FUEL = 'Precio Gasolina 95 E5'

function cruda(id, rotulo, lat, precio) {
  return {
    IDEESS: id,
    'Rótulo': rotulo,
    'Dirección': 'AVENIDA DE ANDALUCÍA, 1',
    Municipio: 'Málaga',
    Provincia: 'MÁLAGA',
    Latitud: String(lat).replace('.', ','),
    'Longitud (WGS84)': '-4,421400',
    [FUEL]: precio
  }
}

const ESTACIONES = [
  cruda('cerca-cara', 'REPSOL', 36.7223, '1,699'),
  cruda('media', 'BP', 36.7413, '1,599'),
  cruda('lejos-barata', 'PLENOIL', 36.7713, '1,499'),
  cruda('sin-precio', 'GALP', 36.7253, ''),
  cruda('fuera', 'BALLENOIL', 36.9213, '1,399')
].map(normalizeStation)

describe('normalizeStation', () => {
  test('lee la dirección con tilde, la coma decimal y la provincia', () => {
    const s = ESTACIONES[0]
    assert.equal(s.address, 'AVENIDA DE ANDALUCÍA, 1')
    assert.equal(s.lat, 36.7223)
    assert.equal(s.prices[FUEL], 1.699)
    assert.equal(s.province, 'Málaga')
  })
})

describe('filterAndRankStations', () => {
  const opciones = { origin: ORIGEN, fuelKey: FUEL, radiusKm: 10 }

  test('por precio: la más barata primero; quita las que no venden el carburante o están fuera', () => {
    const r = filterAndRankStations(ESTACIONES, { ...opciones, sortBy: 'price' })
    assert.deepEqual(r.map((s) => s.id), ['lejos-barata', 'media', 'cerca-cara'])
  })

  test('por distancia: la más cercana primero', () => {
    const r = filterAndRankStations(ESTACIONES, { ...opciones, sortBy: 'distance' })
    assert.deepEqual(r.map((s) => s.id), ['cerca-cara', 'media', 'lejos-barata'])
  })

  test('respeta el máximo de resultados', () => {
    const r = filterAndRankStations(ESTACIONES, { ...opciones, maxResults: 2 })
    assert.equal(r.length, 2)
  })
})

describe('summarizeStations', () => {
  test('calcula la más barata, la más cercana, la media y el ahorro en 50 L', () => {
    const lista = filterAndRankStations(ESTACIONES, { origin: ORIGEN, fuelKey: FUEL, radiusKm: 10 })
    const r = summarizeStations(lista)
    assert.equal(r.count, 3)
    assert.equal(r.cheapest.id, 'lejos-barata')
    assert.equal(r.nearest.id, 'cerca-cara')
    assert.ok(Math.abs(r.average - 1.599) < 1e-9)
    assert.ok(Math.abs(r.savings - 10) < 1e-9) // (1,699 - 1,499) x 50 L
  })

  test('devuelve null si no hay gasolineras', () => {
    assert.equal(summarizeStations([]), null)
  })
})
