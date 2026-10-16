// Componente principal: guarda el estado de la página y reparte los datos a los demás.
//
//   Busqueda   -> formulario (punto de búsqueda y filtros)
//   Resultados -> resumen, mapa y lista de gasolineras
//
// Flujo: el usuario elige un punto -> buscar() llama a /api/gasolineras -> se guarda la
// respuesta en «busqueda» -> se ordena según el carburante y el orden elegidos.

import { useMemo, useState } from 'react'
import Busqueda, { FILTROS_INICIALES } from './componentes/Busqueda.jsx'
import Resultados from './componentes/Resultados.jsx'
import { pedirGasolineras } from './api.js'
import { ordenarGasolineras, resumir } from './calculos.js'

const RADIO_MAXIMO_KM = 50
const TAMANO_LISTA = 20 // gasolineras que se enseñan en la lista y en el mapa

// Texto de un campo -> número ("36,72" o "36.72" -> 36.72). Devuelve null si no es válido.
function leerNumero(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.')
  const n = Number(limpio)
  return limpio !== '' && Number.isFinite(n) ? n : null
}

export default function App() {
  const [punto, setPunto] = useState({ lat: '', lon: '' }) // lo escrito en los campos
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [busqueda, setBusqueda] = useState(null) // la última respuesta del servidor
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState(null) // id de la gasolinera elegida

  // Pide al servidor las gasolineras alrededor de un punto: el de los campos o uno que
  // llega del botón de ubicación o de una ciudad de ejemplo.
  async function buscar(nuevoPunto = punto) {
    setPunto(nuevoPunto)
    setError('')

    const lat = leerNumero(nuevoPunto.lat)
    const lon = leerNumero(nuevoPunto.lon)
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      setError('Introduce una latitud (entre -90 y 90) y una longitud (entre -180 y 180) válidas.')
      return
    }
    // El radio se deja entre 1 y 50 km; si el campo tenía otro valor, se corrige
    const radioKm = Math.min(Math.max(leerNumero(filtros.radioKm) ?? 10, 1), RADIO_MAXIMO_KM)
    if (String(radioKm) !== String(filtros.radioKm)) setFiltros({ ...filtros, radioKm })

    setCargando(true)
    try {
      const datos = await pedirGasolineras({ lat, lon, radioKm, marcas: filtros.marcas, excluir: filtros.excluir })
      setBusqueda({ ...datos, punto: { lat, lon } })
      setSeleccionada(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  // Cambiar de carburante o de orden no vuelve a llamar al servidor: la respuesta ya trae
  // todos los precios, así que se recalcula aquí. useMemo solo lo repite si cambia algo de esto.
  const resultado = useMemo(() => {
    if (!busqueda) return null
    const ordenadas = ordenarGasolineras(busqueda.gasolineras, filtros.carburante, filtros.orden)
    return { resumen: resumir(ordenadas), visibles: ordenadas.slice(0, TAMANO_LISTA), total: ordenadas.length }
  }, [busqueda, filtros.carburante, filtros.orden])

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
          <Busqueda
            punto={punto}
            setPunto={setPunto}
            filtros={filtros}
            setFiltros={setFiltros}
            buscar={buscar}
            cargando={cargando}
          />
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="titulo-resultados" aria-busy={cargando}>
          <h2 id="titulo-resultados">Resultados</h2>
          <Resultados
            busqueda={busqueda}
            resultado={resultado}
            filtros={filtros}
            cargando={cargando}
            seleccionada={seleccionada}
            setSeleccionada={setSeleccionada}
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
          <a href="https://github.com/AngelorumCSE/gasolineras-cercanas" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </small>
      </footer>
    </div>
  )
}
