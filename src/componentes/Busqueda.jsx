// Formulario de búsqueda: el punto (coordenadas, ubicación o ciudad de ejemplo) y los filtros.

import { useState } from 'react'
import { CARBURANTES } from '../../lib/carburantes.js'

// Ciudades de ejemplo, para probar la web sin compartir la ubicación
const CIUDADES = [
  { nombre: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { nombre: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { nombre: 'Valencia', lat: 39.4699, lon: -0.3763 },
  { nombre: 'Sevilla', lat: 37.3891, lon: -5.9845 },
  { nombre: 'Málaga', lat: 36.7213, lon: -4.4214 }
]

export const FILTROS_INICIALES = {
  carburante: 'gasolina95',
  orden: 'precio', // 'precio' o 'distancia'
  radioKm: 10,
  marcas: '', // solo estas marcas, separadas por comas
  excluir: '' // quitar estas marcas
}

export default function Busqueda({ punto, setPunto, filtros, setFiltros, buscar, cargando }) {
  const [avisoUbicacion, setAvisoUbicacion] = useState('')

  // Cambia un filtro sin tocar los demás
  function cambiarFiltro(campo, valor) {
    setFiltros({ ...filtros, [campo]: valor })
  }

  // Pide la ubicación al navegador y, si el usuario da permiso, busca alrededor de ella
  function usarMiUbicacion() {
    if (!('geolocation' in navigator)) {
      setAvisoUbicacion('Este navegador no permite obtener la ubicación.')
      return
    }
    setAvisoUbicacion('Obteniendo tu ubicación…')
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setAvisoUbicacion('Ubicación obtenida.')
        buscar({ lat: posicion.coords.latitude.toFixed(6), lon: posicion.coords.longitude.toFixed(6) })
      },
      (error) => {
        setAvisoUbicacion(
          error.code === error.PERMISSION_DENIED
            ? 'No has dado permiso para usar tu ubicación. Puedes escribir unas coordenadas o elegir una ciudad.'
            : `No se ha podido obtener la ubicación: ${error.message}`
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Deja el formulario como al principio
  function restablecer() {
    setFiltros(FILTROS_INICIALES)
    setPunto({ lat: '', lon: '' })
    setAvisoUbicacion('')
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault() // sin esto, el navegador recargaría la página
        buscar()
      }}
    >
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
              value={punto.lat}
              onChange={(e) => setPunto({ ...punto, lat: e.target.value })}
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
              value={punto.lon}
              onChange={(e) => setPunto({ ...punto, lon: e.target.value })}
              placeholder="Ej.: -3.703790"
            />
          </div>
        </div>

        <button type="button" className="button" onClick={usarMiUbicacion} disabled={cargando}>
          Usar mi ubicación
        </button>
        {avisoUbicacion && <div className="muted small">{avisoUbicacion}</div>}

        <div className="cities">
          <span className="muted small">O prueba con:</span>
          {CIUDADES.map((ciudad) => (
            <button
              key={ciudad.nombre}
              type="button"
              className="chip"
              disabled={cargando}
              onClick={() => buscar({ lat: String(ciudad.lat), lon: String(ciudad.lon) })}
            >
              {ciudad.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Filtros</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="carburante">Carburante</label>
            <select id="carburante" value={filtros.carburante} onChange={(e) => cambiarFiltro('carburante', e.target.value)}>
              {CARBURANTES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="orden">Ordenar por</label>
            <select id="orden" value={filtros.orden} onChange={(e) => cambiarFiltro('orden', e.target.value)}>
              <option value="precio">Precio</option>
              <option value="distancia">Distancia</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="radio">Radio (km, máx. 50)</label>
            <input
              id="radio"
              type="number"
              min="1"
              max="50"
              step="1"
              value={filtros.radioKm}
              onChange={(e) => cambiarFiltro('radioKm', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="marcas">Solo estas marcas (separadas por comas)</label>
            <input
              id="marcas"
              type="text"
              value={filtros.marcas}
              onChange={(e) => cambiarFiltro('marcas', e.target.value)}
              placeholder="Ej.: REPSOL, BP"
            />
          </div>
          <div className="field">
            <label htmlFor="excluir">Excluir marcas</label>
            <input
              id="excluir"
              type="text"
              value={filtros.excluir}
              onChange={(e) => cambiarFiltro('excluir', e.target.value)}
              placeholder="Ej.: CEPSA, SHELL"
            />
          </div>
        </div>
      </fieldset>

      <div className="actions">
        <button type="submit" className="button primary" disabled={cargando}>
          {cargando ? 'Buscando…' : 'Buscar gasolineras'}
        </button>
        <button type="button" className="button" onClick={restablecer} disabled={cargando}>
          Restablecer
        </button>
      </div>
      <p className="muted small hint">
        El carburante y el orden se aplican al momento; el radio y las marcas, al buscar.
      </p>
    </form>
  )
}
