// Tarjeta de una gasolinera en la lista de resultados.

import { enlaceRuta, formatearDistancia, formatearPrecio } from '../formato.js'

export default function Gasolinera({ gasolinera: g, esLaMasBarata, esLaMasCercana, seleccionada, alVerEnElMapa }) {
  // "Málaga" o "Marbella, Málaga" (sin repetir si municipio y provincia coinciden)
  const lugar = g.provincia && g.provincia !== g.municipio ? `${g.municipio}, ${g.provincia}` : g.municipio

  // Clases de CSS: verde si es la más barata y borde azul si está elegida
  const clases = ['station', esLaMasBarata && 'cheapest', seleccionada && 'selected'].filter(Boolean).join(' ')

  return (
    <article id={`gasolinera-${g.id}`} className={clases}>
      <div className="station-main">
        <div className="station-tags">
          {esLaMasBarata && <span className="tag tag-good">La más barata</span>}
          {esLaMasCercana && <span className="tag">La más cercana</span>}
        </div>
        <div className="station-brand">{g.marca}</div>
        <div className="station-address">{g.direccion}</div>
        <div className="station-meta">
          {lugar}
          {g.horario && ` · ${g.horario}`}
        </div>
      </div>

      <div className="station-side">
        <div className="price-value">{formatearPrecio(g.precio)}</div>
        <div className="station-distance">{formatearDistancia(g.distanciaKm)}</div>
        <button type="button" className="link-button" onClick={alVerEnElMapa}>
          Ver en el mapa
        </button>
        <a className="link" href={enlaceRuta(g.lat, g.lon)} target="_blank" rel="noreferrer">
          Cómo llegar
        </a>
      </div>
    </article>
  )
}
