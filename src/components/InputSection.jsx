import React, { useState } from 'react'
import { FUEL_OPTIONS } from '../services/fuelApi.js'

// Puntos de ejemplo para probar la app sin compartir la ubicación.
const EXAMPLE_CITIES = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { name: 'Valencia', lat: 39.4699, lon: -0.3763 },
  { name: 'Sevilla', lat: 37.3891, lon: -5.9845 },
  { name: 'Málaga', lat: 36.7213, lon: -4.4214 }
]

export const DEFAULT_FILTERS = {
  fuelKey: 'Precio Gasolina 95 E5',
  radiusKm: 10,
  sortBy: 'price',
  maxResults: 20,
  includeBrands: '',
  excludeBrands: ''
}

export default function InputSection({ coords, onCoordsChange, filters, onFiltersChange, onSearch, loading }) {
  const [geoStatus, setGeoStatus] = useState('')

  function setCoordField(field, value) {
    onCoordsChange({ ...coords, [field]: value })
  }

  function setFilterField(field, value) {
    onFiltersChange({ ...filters, [field]: value })
  }

  function resetAll() {
    onFiltersChange(DEFAULT_FILTERS)
    onCoordsChange({ lat: '', lon: '' })
    setGeoStatus('')
  }

  function onUseGeolocation() {
    setGeoStatus('')
    if (!('geolocation' in navigator)) {
      setGeoStatus('Este navegador no permite obtener la ubicación.')
      return
    }

    setGeoStatus('Obteniendo tu ubicación…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) }
        setGeoStatus('Ubicación obtenida.')
        onSearch(point)
      },
      (err) => {
        setGeoStatus(
          err.code === err.PERMISSION_DENIED
            ? 'No has dado permiso para usar tu ubicación. Puedes escribir unas coordenadas o elegir una ciudad.'
            : `No se ha podido obtener la ubicación: ${err.message}`
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function onSubmit(e) {
    e.preventDefault()
    onSearch()
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <fieldset className="group">
        <legend>Punto de búsqueda</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="lat">Latitud</label>
            <input
              id="lat"
              type="number"
              inputMode="decimal"
              step="any"
              value={coords.lat ?? ''}
              onChange={(e) => setCoordField('lat', e.target.value)}
              placeholder="Ej.: 40.416775"
            />
          </div>
          <div className="field">
            <label htmlFor="lon">Longitud</label>
            <input
              id="lon"
              type="number"
              inputMode="decimal"
              step="any"
              value={coords.lon ?? ''}
              onChange={(e) => setCoordField('lon', e.target.value)}
              placeholder="Ej.: -3.703790"
            />
          </div>
        </div>

        <button type="button" className="button" onClick={onUseGeolocation} disabled={loading}>
          Usar mi ubicación
        </button>
        {geoStatus ? <div className="muted small">{geoStatus}</div> : null}

        <div className="cities">
          <span className="muted small">O prueba con:</span>
          {EXAMPLE_CITIES.map((c) => (
            <button
              key={c.name}
              type="button"
              className="chip"
              disabled={loading}
              onClick={() => onSearch({ lat: String(c.lat), lon: String(c.lon) })}
            >
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Filtros</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="fuel">Carburante</label>
            <select id="fuel" value={filters.fuelKey} onChange={(e) => setFilterField('fuelKey', e.target.value)}>
              {FUEL_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sort">Ordenar por</label>
            <select id="sort" value={filters.sortBy} onChange={(e) => setFilterField('sortBy', e.target.value)}>
              <option value="price">Precio</option>
              <option value="distance">Distancia</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="radius">Radio (km, máx. 50)</label>
            <input
              id="radius"
              type="number"
              min="1"
              max="50"
              step="1"
              value={filters.radiusKm}
              onChange={(e) => setFilterField('radiusKm', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="max">Resultados en la lista</label>
            <input
              id="max"
              type="number"
              min="1"
              max="50"
              step="1"
              value={filters.maxResults}
              onChange={(e) => setFilterField('maxResults', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="include">Solo estas marcas (separadas por comas)</label>
            <input
              id="include"
              type="text"
              value={filters.includeBrands}
              onChange={(e) => setFilterField('includeBrands', e.target.value)}
              placeholder="Ej.: REPSOL, BP"
            />
          </div>
          <div className="field">
            <label htmlFor="exclude">Excluir marcas</label>
            <input
              id="exclude"
              type="text"
              value={filters.excludeBrands}
              onChange={(e) => setFilterField('excludeBrands', e.target.value)}
              placeholder="Ej.: CEPSA, SHELL"
            />
          </div>
        </div>
      </fieldset>

      <div className="actions">
        <button type="submit" className="button primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar gasolineras'}
        </button>
        <button type="button" className="button" onClick={resetAll} disabled={loading}>
          Restablecer
        </button>
      </div>
      <p className="muted small hint">
        El carburante, el orden y el número de resultados se aplican al momento; el radio y las marcas, al buscar.
      </p>
    </form>
  )
}
