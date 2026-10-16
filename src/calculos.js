// Cálculos que hace la web con las gasolineras de la búsqueda.
// Son funciones puras (no tocan la pantalla), así que se prueban fácilmente (tests/calculos.test.js).

// Se queda con las gasolineras que venden el carburante elegido, añade a cada una su
// precio y las ordena por precio (a igual precio, la más cercana primero) o por distancia.
export function ordenarGasolineras(gasolineras, carburante, orden) {
  const conPrecio = gasolineras
    .filter((g) => g.precios[carburante] !== undefined)
    .map((g) => ({ ...g, precio: g.precios[carburante] }))
  if (orden === 'precio') {
    conPrecio.sort((a, b) => a.precio - b.precio || a.distanciaKm - b.distanciaKm)
  } else {
    conPrecio.sort((a, b) => a.distanciaKm - b.distanciaKm)
  }
  return conPrecio
}

// Resumen de la búsqueda: la más barata, la más cercana, el precio medio y cuánto se
// ahorra al llenar el depósito en la más barata en lugar de en la más cara.
export function resumir(gasolineras, litros = 50) {
  if (gasolineras.length === 0) return null
  const porPrecio = [...gasolineras].sort((a, b) => a.precio - b.precio || a.distanciaKm - b.distanciaKm)
  const porDistancia = [...gasolineras].sort((a, b) => a.distanciaKm - b.distanciaKm)
  const masBarata = porPrecio[0]
  const masCara = porPrecio[porPrecio.length - 1]
  const suma = gasolineras.reduce((total, g) => total + g.precio, 0)
  return {
    total: gasolineras.length,
    masBarata,
    masCercana: porDistancia[0],
    precioMedio: suma / gasolineras.length,
    litros,
    ahorro: (masCara.precio - masBarata.precio) * litros
  }
}
