import React from 'react'
import { directionsUrl, formatDistance, formatPrice } from '../utils/format.js'

export default function StationCard({ station, isCheapest, isNearest, selected, onSelect }) {
  const place = [station.town, station.province && station.province !== station.town ? station.province : '']
    .filter(Boolean)
    .join(', ')

  return (
    <article
      id={`estacion-${station.id}`}
      className={'station' + (selected ? ' selected' : '') + (isCheapest ? ' cheapest' : '')}
      tabIndex={0}
      aria-label={`${station.brand || 'Sin marca'}, ${formatPrice(station.selectedFuelPrice)}, a ${formatDistance(station.distanceKm)}`}
      onClick={() => onSelect(station.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect(station.id)
        }
      }}
    >
      <div className="station-main">
        <div className="station-tags">
          {isCheapest ? <span className="tag tag-good">La más barata</span> : null}
          {isNearest ? <span className="tag">La más cercana</span> : null}
        </div>
        <div className="station-brand">{station.brand || 'Sin marca'}</div>
        <div className="station-address">{station.address}</div>
        <div className="station-meta">
          {place}
          {station.schedule ? ` · ${station.schedule}` : ''}
        </div>
      </div>

      <div className="station-side">
        <div className="price-value">{formatPrice(station.selectedFuelPrice)}</div>
        <div className="station-distance">{formatDistance(station.distanceKm)}</div>
        <a
          className="link"
          href={directionsUrl(station.lat, station.lon)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Cómo llegar
        </a>
      </div>
    </article>
  )
}
