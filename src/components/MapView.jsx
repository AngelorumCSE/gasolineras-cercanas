import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { directionsUrl, formatDistance, formatPrice } from '../utils/format.js'

const COLORS = { station: '#2563eb', cheapest: '#15803d', origin: '#0f172a' }

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function popupHtml(s, isCheapest) {
  return `
    <div class="popup">
      ${isCheapest ? '<div class="popup-tag">La más barata</div>' : ''}
      <strong>${escapeHtml(s.brand || 'Sin marca')}</strong><br/>
      ${escapeHtml(s.address)}<br/>
      <span class="popup-price">${formatPrice(s.selectedFuelPrice)}</span> · ${formatDistance(s.distanceKm)}<br/>
      <a href="${directionsUrl(s.lat, s.lon)}" target="_blank" rel="noreferrer">Cómo llegar</a>
    </div>`
}

// Mapa de Leaflet con teselas de OpenStreetMap: tu posición, el radio de búsqueda y las gasolineras.
export default function MapView({ origin, radiusKm, stations, cheapestId, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const searchLayerRef = useRef(null)
  const stationsLayerRef = useRef(null)
  const markersRef = useRef(new Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Se crea el mapa una sola vez.
  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomSnap: 0.25 }).setView([40.0, -3.7], 6)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)
    searchLayerRef.current = L.layerGroup().addTo(map)
    stationsLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Posición de búsqueda y círculo del radio; se encuadra el mapa en el círculo.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !origin) return
    const layer = searchLayerRef.current
    layer.clearLayers()
    L.circle([origin.lat, origin.lon], {
      radius: radiusKm * 1000,
      color: COLORS.station,
      weight: 1.5,
      dashArray: '6 6',
      fillOpacity: 0.04,
      interactive: false
    }).addTo(layer)
    L.circleMarker([origin.lat, origin.lon], {
      radius: 7,
      color: '#ffffff',
      weight: 3,
      fillColor: COLORS.origin,
      fillOpacity: 1
    })
      .bindTooltip('Punto de búsqueda')
      .addTo(layer)
    map.fitBounds(L.latLng(origin.lat, origin.lon).toBounds(radiusKm * 2000), { padding: [12, 12] })
  }, [origin, radiusKm])

  // Un marcador por gasolinera; la más barata en verde y por encima del resto.
  useEffect(() => {
    if (!mapRef.current) return
    const layer = stationsLayerRef.current
    layer.clearLayers()
    markersRef.current.clear()
    const ordered = [...stations].sort((a, b) => (a.id === cheapestId) - (b.id === cheapestId))
    for (const s of ordered) {
      const isCheapest = s.id === cheapestId
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: isCheapest ? 10 : 7,
        color: '#ffffff',
        weight: 2,
        fillColor: isCheapest ? COLORS.cheapest : COLORS.station,
        fillOpacity: 1
      })
        .bindTooltip(`${s.brand || 'Sin marca'} · ${formatPrice(s.selectedFuelPrice)}`)
        .bindPopup(popupHtml(s, isCheapest))
        .on('click', () => onSelectRef.current?.(s.id, { fromMap: true }))
        .addTo(layer)
      markersRef.current.set(s.id, marker)
    }
  }, [stations, cheapestId])

  // Al elegir una gasolinera en la lista, se centra el mapa en ella y se abre su ficha.
  useEffect(() => {
    const marker = markersRef.current.get(selectedId)
    if (!marker || !mapRef.current) return
    mapRef.current.panTo(marker.getLatLng())
    marker.openPopup()
  }, [selectedId, stations])

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" role="region" aria-label="Mapa de gasolineras" />
      <div className="map-legend" aria-hidden="true">
        <span><i className="dot" style={{ background: COLORS.cheapest }} /> La más barata</span>
        <span><i className="dot" style={{ background: COLORS.station }} /> Otras gasolineras</span>
        <span><i className="dot" style={{ background: COLORS.origin }} /> Punto de búsqueda</span>
      </div>
    </div>
  )
}
