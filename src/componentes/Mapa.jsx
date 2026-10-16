// Mapa con react-leaflet (Leaflet + teselas de OpenStreetMap): el punto de búsqueda,
// el círculo del radio y un marcador por gasolinera (la más barata, en verde).

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Circle, CircleMarker, MapContainer, Pane, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { enlaceRuta, formatearDistancia, formatearPrecio } from '../formato.js'

const AZUL = '#2563eb'
const VERDE = '#15803d'
const NEGRO = '#0f172a'

// Encuadra el mapa en el círculo de búsqueda cada vez que cambian el punto o el radio.
// (Va en un componente aparte porque useMap solo funciona dentro de <MapContainer>.)
function Encuadrar({ punto, radioKm }) {
  const mapa = useMap()
  useEffect(() => {
    const limites = L.latLng(punto.lat, punto.lon).toBounds(radioKm * 2000) // cuadrado de lado 2 x radio, en metros
    mapa.fitBounds(limites, { padding: [12, 12] })
  }, [mapa, punto, radioKm])
  return null
}

// Cuando se elige una gasolinera en la lista, centra el mapa en ella y abre su ficha.
function AbrirSeleccionada({ id, marcadores }) {
  const mapa = useMap()
  useEffect(() => {
    const marcador = marcadores.current[id]
    if (!marcador) return
    mapa.getContainer().scrollIntoView({ behavior: 'smooth', block: 'nearest' }) // que el mapa se vea en pantalla
    mapa.panTo(marcador.getLatLng())
    marcador.openPopup()
  }, [mapa, id, marcadores])
  return null
}

// Marcador de una gasolinera, con un texto al pasar el ratón y una ficha al pulsarlo
function Marcador({ gasolinera: g, esLaMasBarata, marcadores, alElegir }) {
  return (
    <CircleMarker
      center={[g.lat, g.lon]}
      radius={esLaMasBarata ? 10 : 7}
      pathOptions={{ color: 'white', weight: 2, fillColor: esLaMasBarata ? VERDE : AZUL, fillOpacity: 1 }}
      ref={(marcador) => {
        marcadores.current[g.id] = marcador // se guarda para poder abrir su ficha desde la lista
      }}
      eventHandlers={{ click: () => alElegir(g.id) }}
    >
      <Tooltip>
        {g.marca} · {formatearPrecio(g.precio)}
      </Tooltip>
      <Popup>
        <div className="popup">
          {esLaMasBarata && <div className="popup-tag">La más barata</div>}
          <strong>{g.marca}</strong>
          <br />
          {g.direccion}
          <br />
          <span className="popup-price">{formatearPrecio(g.precio)}</span> · {formatearDistancia(g.distanciaKm)}
          <br />
          <a href={enlaceRuta(g.lat, g.lon)} target="_blank" rel="noreferrer">
            Cómo llegar
          </a>
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default function Mapa({ punto, radioKm, gasolineras, idMasBarata, seleccionada, alElegir }) {
  const marcadores = useRef({}) // id de la gasolinera -> su marcador de Leaflet
  const masBarata = gasolineras.find((g) => g.id === idMasBarata)
  const resto = gasolineras.filter((g) => g.id !== idMasBarata)

  return (
    <div className="map-wrap">
      <MapContainer center={[punto.lat, punto.lon]} zoom={12} scrollWheelZoom={false} zoomSnap={0.25} className="map">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Encuadrar punto={punto} radioKm={radioKm} />
        <AbrirSeleccionada id={seleccionada} marcadores={marcadores} />

        {/* Círculo del radio de búsqueda y punto de búsqueda */}
        <Circle
          center={[punto.lat, punto.lon]}
          radius={radioKm * 1000}
          pathOptions={{ color: AZUL, weight: 1.5, dashArray: '6 6', fillOpacity: 0.04 }}
          interactive={false}
        />
        <CircleMarker
          center={[punto.lat, punto.lon]}
          radius={7}
          pathOptions={{ color: 'white', weight: 3, fillColor: NEGRO, fillOpacity: 1 }}
        >
          <Tooltip>Punto de búsqueda</Tooltip>
        </CircleMarker>

        {/* Gasolineras; la más barata va en una capa propia para que quede por encima */}
        {resto.map((g) => (
          <Marcador key={g.id} gasolinera={g} esLaMasBarata={false} marcadores={marcadores} alElegir={alElegir} />
        ))}
        {masBarata && (
          <Pane name="mas-barata" style={{ zIndex: 450 }}>
            <Marcador gasolinera={masBarata} esLaMasBarata marcadores={marcadores} alElegir={alElegir} />
          </Pane>
        )}
      </MapContainer>

      <div className="map-legend" aria-hidden="true">
        <span>
          <i className="dot" style={{ background: VERDE }} /> La más barata
        </span>
        <span>
          <i className="dot" style={{ background: AZUL }} /> Otras gasolineras
        </span>
        <span>
          <i className="dot" style={{ background: NEGRO }} /> Punto de búsqueda
        </span>
      </div>
    </div>
  )
}
