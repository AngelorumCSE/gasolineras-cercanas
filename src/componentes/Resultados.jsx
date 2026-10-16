// Resultados de la búsqueda: resumen en cifras, mapa y lista de gasolineras.

import Gasolinera from './Gasolinera.jsx'
import Mapa from './Mapa.jsx'
import { nombreCarburante } from '../../lib/carburantes.js'
import { formatearDistancia, formatearEuros, formatearFecha, formatearPrecio } from '../formato.js'

// 1 -> "1 gasolinera"; 57 -> "57 gasolineras"
function contarGasolineras(n) {
  return `${n} ${n === 1 ? 'gasolinera' : 'gasolineras'}`
}

// Una cifra del resumen (la más barata, el precio medio...)
function Cifra({ titulo, valor, nota }) {
  return (
    <div className="kpi">
      <div className="kpi-title">{titulo}</div>
      <div className="kpi-value">{valor}</div>
      <div className="kpi-note">{nota}</div>
    </div>
  )
}

export default function Resultados({ busqueda, resultado, filtros, cargando, seleccionada, setSeleccionada }) {
  // Mientras llega la respuesta
  if (cargando) {
    return (
      <div className="empty">
        <div className="spinner" aria-hidden="true"></div>
        <p className="muted">Consultando los precios del Ministerio…</p>
      </div>
    )
  }

  // Antes de la primera búsqueda
  if (!busqueda) {
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

  const { resumen, visibles, total } = resultado
  const carburante = nombreCarburante(filtros.carburante)

  // Búsqueda sin resultados
  if (!resumen) {
    return (
      <div className="empty">
        <p>
          No hay gasolineras con {carburante} a menos de {busqueda.radioKm} km con esos filtros.
        </p>
        <p className="muted">Prueba a ampliar el radio, cambiar de carburante o quitar los filtros de marcas.</p>
      </div>
    )
  }

  const { masBarata, masCercana } = resumen
  const fecha = formatearFecha(busqueda.fecha)
  const orden = filtros.orden === 'precio' ? 'precio' : 'distancia'
  const pie =
    visibles.length < total
      ? `Se muestran las ${visibles.length} primeras de ${total}, ordenadas por ${orden}.`
      : `${contarGasolineras(total)}, ordenadas por ${orden}.`

  return (
    <div className="results">
      <p className="results-title">
        <strong>{contarGasolineras(total)}</strong> con <strong>{carburante}</strong> a menos de {busqueda.radioKm} km
      </p>
      {fecha && <p className="muted small">Precios oficiales del {fecha}.</p>}
      {busqueda.incompleto && (
        <p className="warning">Alguna provincia no ha respondido; puede que falten gasolineras.</p>
      )}

      <div className="kpis">
        <Cifra titulo="La más barata" valor={formatearPrecio(masBarata.precio)} nota={masBarata.marca} />
        <Cifra titulo="Precio medio" valor={formatearPrecio(resumen.precioMedio)} nota={contarGasolineras(total)} />
        <Cifra titulo="La más cercana" valor={formatearDistancia(masCercana.distanciaKm)} nota={masCercana.marca} />
        <Cifra titulo={`Ahorro en ${resumen.litros} L`} valor={formatearEuros(resumen.ahorro)} nota="frente a la más cara" />
      </div>

      <Mapa
        punto={busqueda.punto}
        radioKm={busqueda.radioKm}
        gasolineras={visibles}
        idMasBarata={masBarata.id}
        seleccionada={seleccionada}
        alElegir={setSeleccionada}
      />

      <p className="muted small list-caption">{pie} El mapa enseña las mismas gasolineras que la lista.</p>
      <div className="list">
        {visibles.map((g) => (
          <Gasolinera
            key={g.id}
            gasolinera={g}
            esLaMasBarata={g.id === masBarata.id}
            esLaMasCercana={g.id === masCercana.id}
            seleccionada={g.id === seleccionada}
            alVerEnElMapa={() => setSeleccionada(g.id)}
          />
        ))}
      </div>
    </div>
  )
}
