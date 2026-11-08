import { useState } from 'react';
import { PanelCampanias, type FiltrosCampanias } from './paneles/PanelCampanias';
import { PanelComparar } from './paneles/PanelComparar';
import { PanelInventario } from './paneles/PanelInventario';
import { DetalleCampania } from './paneles/DetalleCampania';
export function Analisis() {
  const [pestania, cambiarPestania] = useState('Campañas');
  const [id, elegir] = useState<string | null>(null);
  const [filtros, cambiarFiltros] = useState<FiltrosCampanias>({
    estado: '',
    cultivo: '',
    pagina: 0,
  });
  return (
    <section className="agro-panel agro-analisis">
      <p className="agro-etiqueta">GERENCIA</p>
      <h1>Análisis</h1>
      <nav className="ana-pestanias" aria-label="Paneles de análisis">
        {['Campañas', 'Comparar', 'Inventario'].map((p) => (
          <button
            key={p}
            aria-current={pestania === p ? 'page' : undefined}
            onClick={() => {
              cambiarPestania(p);
              elegir(null);
            }}
          >
            {p}
          </button>
        ))}
      </nav>
      {pestania === 'Campañas' &&
        (id ? (
          <DetalleCampania key={id} id={id} volver={() => elegir(null)} />
        ) : (
          <PanelCampanias filtros={filtros} cambiar={cambiarFiltros} abrir={elegir} />
        ))}
      {pestania === 'Comparar' && <PanelComparar />}
      {pestania === 'Inventario' && <PanelInventario />}
    </section>
  );
}
