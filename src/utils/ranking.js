import { haversineKm } from './haversine.js'

function normalizeList(str) {
  if (!str || typeof str !== 'string') return []
  return str
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function brandMatches(brand, items) {
  const b = (brand || '').toUpperCase()
  return items.some((i) => b.includes(i))
}

// Devuelve las gasolineras dentro del radio que venden el carburante elegido y cumplen
// los filtros de marcas, ordenadas por precio (y, a igual precio, por distancia) o por distancia.
export function filterAndRankStations(
  stations,
  { origin, fuelKey, radiusKm, maxResults, includeBrands, excludeBrands, sortBy = 'price' }
) {
  const include = normalizeList(includeBrands)
  const exclude = normalizeList(excludeBrands)

  const processed = stations
    .map((s) => ({
      ...s,
      distanceKm: haversineKm(origin, { lat: s.lat, lon: s.lon }),
      selectedFuelPrice: s.prices?.[fuelKey] ?? null
    }))
    .filter((s) => !Number.isFinite(radiusKm) || s.distanceKm <= radiusKm)
    .filter((s) => s.selectedFuelPrice > 0)
    .filter((s) => {
      if (include.length && !brandMatches(s.brand, include)) return false
      if (exclude.length && brandMatches(s.brand, exclude)) return false
      return true
    })
    .sort((a, b) =>
      sortBy === 'price'
        ? a.selectedFuelPrice - b.selectedFuelPrice || a.distanceKm - b.distanceKm
        : a.distanceKm - b.distanceKm
    )

  return Number.isFinite(maxResults) ? processed.slice(0, Math.max(1, maxResults)) : processed
}

// Resumen de las gasolineras ya filtradas: la más barata, la más cercana, el precio medio
// y cuánto se ahorra al llenar un depósito en la más barata frente a la más cara.
export function summarizeStations(stations, liters = 50) {
  if (!stations.length) return null

  let cheapest = stations[0]
  let nearest = stations[0]
  let mostExpensive = stations[0]
  let total = 0

  for (const s of stations) {
    const p = s.selectedFuelPrice
    if (p < cheapest.selectedFuelPrice || (p === cheapest.selectedFuelPrice && s.distanceKm < cheapest.distanceKm)) {
      cheapest = s
    }
    if (s.distanceKm < nearest.distanceKm) nearest = s
    if (p > mostExpensive.selectedFuelPrice) mostExpensive = s
    total += p
  }

  return {
    count: stations.length,
    cheapest,
    nearest,
    mostExpensive,
    average: total / stations.length,
    liters,
    savings: (mostExpensive.selectedFuelPrice - cheapest.selectedFuelPrice) * liters
  }
}
