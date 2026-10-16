import React, { useMemo, useState } from 'react'
import InputSection, { DEFAULT_FILTERS } from './components/InputSection.jsx'
import ResultsSection from './components/ResultsSection.jsx'
import { fetchStations } from './services/fuelApi.js'
import { normalizeStationList, toNumber } from './utils/normalize.js'
import { filterAndRankStations, summarizeStations } from './utils/ranking.js'

const MAX_RADIUS_KM = 50
const MAX_LIST = 50

function clamp(value, min, max, fallback) {
  const n = toNumber(String(value ?? ''))
  return n === null ? fallback : Math.min(Math.max(n, min), max)
}

function readCoordinate(value, limit) {
  const n = toNumber(String(value ?? ''))
  return n !== null && Math.abs(n) <= limit ? n : null
}

export default function App() {
  const [coords, setCoords] = useState({ lat: '', lon: '' })
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  // Última búsqueda correcta: punto, radio, marcas y gasolineras devueltas por la API.
  const [search, setSearch] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  async function onSearch(point) {
    const target = point ?? coords
    if (point) setCoords(point)
    setError('')

    const lat = readCoordinate(target.lat, 90)
    const lon = readCoordinate(target.lon, 180)
    if (lat === null || lon === null) {
      setError('Introduce una latitud (entre -90 y 90) y una longitud (entre -180 y 180) válidas.')
      return
    }

    const radiusKm = clamp(filters.radiusKm, 1, MAX_RADIUS_KM, DEFAULT_FILTERS.radiusKm)
    if (String(radiusKm) !== String(filters.radiusKm)) setFilters({ ...filters, radiusKm })

    setLoading(true)
    try {
      const data = await fetchStations({
        lat,
        lon,
        radiusKm,
        includeBrands: filters.includeBrands,
        excludeBrands: filters.excludeBrands
      })
      setSearch({
        origin: { lat, lon },
        radiusKm,
        includeBrands: filters.includeBrands,
        excludeBrands: filters.excludeBrands,
        stations: normalizeStationList(data.stations),
        fecha: data.fecha,
        incompleto: data.incompleto
      })
      setSelectedId(null)
    } catch (e) {
      setError(e?.message || 'Error al obtener los datos de la API.')
    } finally {
      setLoading(false)
    }
  }

  // El carburante, el orden y el número de resultados se aplican sin volver a llamar a la API.
  const result = useMemo(() => {
    if (!search) return null
    const all = filterAndRankStations(search.stations, {
      origin: search.origin,
      radiusKm: search.radiusKm,
      fuelKey: filters.fuelKey,
      sortBy: filters.sortBy,
      includeBrands: search.includeBrands,
      excludeBrands: search.excludeBrands
    })
    const summary = summarizeStations(all)
    const visible = all.slice(0, clamp(filters.maxResults, 1, MAX_LIST, DEFAULT_FILTERS.maxResults))
    // En el mapa también aparecen la más barata y la más cercana aunque no entren en la lista.
    const mapStations = summary
      ? [...new Map([...visible, summary.cheapest, summary.nearest].map((s) => [s.id, s])).values()]
      : []
    return { all, visible, summary, mapStations }
  }, [search, filters.fuelKey, filters.sortBy, filters.maxResults])

  function onSelect(id, { fromMap = false } = {}) {
    setSelectedId(id)
    if (fromMap) {
      requestAnimationFrame(() =>
        document.getElementById(`estacion-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      )
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20h12M6.5 8h5" strokeLinecap="round" />
            <path d="M14 10h1.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 0 3 0V8l-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1>Gasolineras cercanas</h1>
          <p className="sub">
            Encuentra las gasolineras más baratas a tu alrededor con los precios oficiales, que se actualizan cada
            media hora.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="card" aria-labelledby="titulo-busqueda">
          <h2 id="titulo-busqueda">Búsqueda</h2>
          <InputSection
            coords={coords}
            onCoordsChange={setCoords}
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={onSearch}
            loading={loading}
          />
          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}
        </section>

        <section className="card" aria-labelledby="titulo-resultados" aria-busy={loading}>
          <h2 id="titulo-resultados">Resultados</h2>
          <ResultsSection
            search={search}
            result={result}
            fuelKey={filters.fuelKey}
            sortBy={filters.sortBy}
            loading={loading}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </section>
      </main>

      <footer className="footer">
        <small>
          Precios: servicio REST del{' '}
          <a href="https://geoportalgasolineras.es/" target="_blank" rel="noreferrer">
            Geoportal Gasolineras
          </a>{' '}
          (Gobierno de España). Mapa: © OpenStreetMap. Código en{' '}
          <a href="https://github.com/AngelorumCSE" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </small>
      </footer>
    </div>
  )
}
