import React from 'react'
import MapView from './MapView.jsx'
import StationCard from './StationCard.jsx'
import { fuelLabel } from '../services/fuelApi.js'
import { formatApiDate, formatDistance, formatEuros, formatPrice } from '../utils/format.js'

const stationsText = (n) => `${n} ${n === 1 ? 'gasolinera' : 'gasolineras'}`

function listCaption(shown, total, sortBy) {
  if (total === 1) return 'Pulsa la gasolinera para verla en el mapa.'
  const order = sortBy === 'price' ? 'precio' : 'distancia'
  const count = shown < total ? `Se muestran las ${shown} primeras de ${total}` : stationsText(total)
  return `${count}, ordenadas por ${order}. Pulsa una gasolinera para verla en el mapa.`
}

function Kpi({ title, value, note }) {
  return (
    <div className="kpi">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {note ? <div className="kpi-note">{note}</div> : null}
    </div>
  )
}

export default function ResultsSection({ search, result, fuelKey, sortBy, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="empty">
        <div className="spinner" aria-hidden="true"></div>
        <p className="muted">Consultando los precios del Ministerio…</p>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="empty">
        <p>Elige un punto de búsqueda: escribe unas coordenadas, usa tu ubicación o prueba con una ciudad.</p>
        <p className="muted">
          Verás las gasolineras que venden el carburante elegido dentro del radio, con la más barata y la más
          cercana destacadas en la lista y en el mapa.
        </p>
      </div>
    )
  }

  const { all, visible, summary } = result
  const fecha = formatApiDate(search.fecha)

  if (!summary) {
    return (
      <div className="empty">
        <p>No hay gasolineras con {fuelLabel(fuelKey)} a menos de {search.radiusKm} km con esos filtros.</p>
        <p className="muted">Prueba a ampliar el radio, cambiar de carburante o quitar los filtros de marcas.</p>
      </div>
    )
  }

  const { cheapest, nearest } = summary

  return (
    <div className="results">
      <p className="results-title">
        <strong>{stationsText(summary.count)}</strong> con <strong>{fuelLabel(fuelKey)}</strong> a menos de{' '}
        {search.radiusKm} km
      </p>
      {fecha ? <p className="muted small">Precios oficiales del {fecha}.</p> : null}
      {search.incompleto ? (
        <p className="warning">Alguna provincia no ha respondido; puede que falten gasolineras.</p>
      ) : null}

      <div className="kpis">
        <Kpi title="La más barata" value={formatPrice(cheapest.selectedFuelPrice)} note={cheapest.brand || 'Sin marca'} />
        <Kpi title="Precio medio" value={formatPrice(summary.average)} note={stationsText(summary.count)} />
        <Kpi title="La más cercana" value={formatDistance(nearest.distanceKm)} note={nearest.brand || 'Sin marca'} />
        <Kpi
          title={`Ahorro en ${summary.liters} L`}
          value={formatEuros(summary.savings)}
          note="frente a la más cara"
        />
      </div>

      <MapView
        origin={search.origin}
        radiusKm={search.radiusKm}
        stations={result.mapStations}
        cheapestId={cheapest.id}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <p className="muted small list-caption">{listCaption(visible.length, all.length, sortBy)}</p>

      <div className="list">
        {visible.map((s) => (
          <StationCard
            key={s.id}
            station={s}
            isCheapest={s.id === cheapest.id}
            isNearest={s.id === nearest.id}
            selected={s.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
