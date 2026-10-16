// Carburantes que se pueden elegir en la web. Lo usan el servidor (para leer los
// precios de la API) y la web (para el desplegable).
//   id:       nombre corto que usamos en nuestro código
//   nombre:   lo que se enseña en pantalla
//   claveApi: nombre del campo con su precio en la API del Ministerio
export const CARBURANTES = [
  { id: 'gasolina95', nombre: 'Gasolina 95 E5', claveApi: 'Precio Gasolina 95 E5' },
  { id: 'gasolina98', nombre: 'Gasolina 98 E5', claveApi: 'Precio Gasolina 98 E5' },
  { id: 'gasoleoA', nombre: 'Gasóleo A', claveApi: 'Precio Gasoleo A' },
  { id: 'gasoleoPremium', nombre: 'Gasóleo Premium', claveApi: 'Precio Gasoleo Premium' },
  { id: 'gasoleoB', nombre: 'Gasóleo B (agrícola)', claveApi: 'Precio Gasoleo B' },
  { id: 'glp', nombre: 'GLP (autogás)', claveApi: 'Precio Gases licuados del petróleo' },
  { id: 'gnc', nombre: 'Gas natural comprimido (GNC)', claveApi: 'Precio Gas Natural Comprimido' },
  { id: 'gnl', nombre: 'Gas natural licuado (GNL)', claveApi: 'Precio Gas Natural Licuado' }
]

// 'gasoleoA' -> 'Gasóleo A'
export function nombreCarburante(id) {
  return CARBURANTES.find((c) => c.id === id)?.nombre ?? id
}
