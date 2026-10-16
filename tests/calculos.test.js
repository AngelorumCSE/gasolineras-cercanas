// Pruebas de la ordenación y el resumen que calcula la web (src/calculos.js).
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ordenarGasolineras, resumir } from '../src/calculos.js'

// Gasolineras ya limpias, como las devuelve /api/gasolineras
const GASOLINERAS = [
  { id: 'cerca-cara', marca: 'REPSOL', distanciaKm: 0.1, precios: { gasolina95: 1.699 } },
  { id: 'media', marca: 'BP', distanciaKm: 2.2, precios: { gasolina95: 1.599, gasoleoA: 1.459 } },
  { id: 'lejos-barata', marca: 'PLENOIL', distanciaKm: 5.6, precios: { gasolina95: 1.499 } },
  { id: 'solo-gasoleo', marca: 'GALP', distanciaKm: 0.4, precios: { gasoleoA: 1.489 } }
]

describe('ordenarGasolineras', () => {
  test('por precio: la más barata primero y fuera las que no venden ese carburante', () => {
    const r = ordenarGasolineras(GASOLINERAS, 'gasolina95', 'precio')
    assert.deepEqual(r.map((g) => g.id), ['lejos-barata', 'media', 'cerca-cara'])
    assert.equal(r[0].precio, 1.499) // añade el precio del carburante elegido
  })

  test('por distancia: la más cercana primero', () => {
    const r = ordenarGasolineras(GASOLINERAS, 'gasolina95', 'distancia')
    assert.deepEqual(r.map((g) => g.id), ['cerca-cara', 'media', 'lejos-barata'])
  })

  test('a igual precio, gana la más cercana', () => {
    const empatadas = [
      { id: 'lejos', distanciaKm: 3, precios: { gasolina95: 1.5 } },
      { id: 'cerca', distanciaKm: 1, precios: { gasolina95: 1.5 } }
    ]
    assert.deepEqual(ordenarGasolineras(empatadas, 'gasolina95', 'precio').map((g) => g.id), ['cerca', 'lejos'])
  })
})

describe('resumir', () => {
  test('la más barata, la más cercana, el precio medio y el ahorro en 50 L', () => {
    const r = resumir(ordenarGasolineras(GASOLINERAS, 'gasolina95', 'distancia'))
    assert.equal(r.total, 3)
    assert.equal(r.masBarata.id, 'lejos-barata')
    assert.equal(r.masCercana.id, 'cerca-cara')
    assert.ok(Math.abs(r.precioMedio - 1.599) < 1e-9)
    assert.ok(Math.abs(r.ahorro - 10) < 1e-9) // (1,699 - 1,499) x 50 L
  })

  test('devuelve null si no hay gasolineras', () => {
    assert.equal(resumir([]), null)
  })
})
