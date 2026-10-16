import { FUEL_OPTIONS } from '../services/fuelApi.js'

// La API usa coma decimal en coordenadas y precios ("36,721722", "1,699").
export function toNumber(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// "MÁLAGA" -> "Málaga", "BALEARS (ILLES)" -> "Balears (Illes)"
function titleCase(text) {
  return text.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase())
}

export function normalizeStation(raw) {
  const lat = toNumber(raw.Latitud ?? raw.lat ?? raw.latitude)
  const lon = toNumber(raw['Longitud (WGS84)'] ?? raw.Longitud ?? raw.lon ?? raw.longitude)

  const prices = {}
  for (const opt of FUEL_OPTIONS) {
    prices[opt.key] = toNumber(raw[opt.key])
  }

  const address = raw['Dirección'] ?? raw.Direccion ?? raw.address ?? ''

  return {
    id: String(raw.IDEESS || raw.ID || raw.id || `${lat},${lon},${address}`),
    brand: String(raw['Rótulo'] ?? raw.Rotulo ?? raw.Marca ?? raw.brand ?? '').trim(),
    address: String(address).trim(),
    town: String(raw.Municipio ?? raw.town ?? '').trim(),
    province: titleCase(String(raw.Provincia ?? raw.province ?? '').trim()),
    schedule: String(raw.Horario ?? raw.schedule ?? '').trim(),
    lat,
    lon,
    prices
  }
}

export function normalizeStationList(rawList) {
  if (!Array.isArray(rawList)) return []
  return rawList
    .map(normalizeStation)
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
}
