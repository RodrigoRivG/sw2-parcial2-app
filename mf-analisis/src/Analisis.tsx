import { useState } from 'react';
import { PanelCampanias, type FiltrosCampanias } from './paneles/PanelCampanias';
import { PanelComparar } from './paneles/PanelComparar';
import { PanelInventario } from './paneles/PanelInventario';
import { DetalleCampania } from './paneles/DetalleCampania';
import { PanelPrediccion } from './paneles/PanelPrediccion';
import { PanelPatrones } from './paneles/PanelPatrones';
import { PanelAsistente } from './paneles/PanelAsistente';
import { PanelReportes } from './paneles/PanelReportes';
export function Analisis() {
  const [pestania, cambiarPestania] = useState('Campañas');
  const [id, elegir] = useState<string | null>(null);
  const [idPrediccion, elegirPrediccion] = useState<string | null>(null);
  const [visitadas, guardarVisitadas] = useState<string[]>([]);
  function ir(p: string) {
    cambiarPestania(p);
    guardarVisitadas((v) => (v.includes(p) ? v : [...v, p]));
  }
  function estimarCampania(id: string) {
    elegirPrediccion(id);
    ir('Predicción');
  }
  function abrirCampania(id: string) {
    elegir(id);
    ir('Campañas');
  }
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
        {[
          'Campañas',
          'Comparar',
          'Inventario',
          'Predicción',
          'Patrones',
          'Asistente',
          'Reportes',
        ].map((p) => (
          <button
            key={p}
            aria-current={pestania === p ? 'page' : undefined}
            onClick={() => {
              ir(p);
              elegir(null);
            }}
          >
            {p}
          </button>
        ))}
      </nav>
      {pestania === 'Campañas' &&
        (id ? (
          <DetalleCampania key={id} id={id} volver={() => elegir(null)} estimar={estimarCampania} />
        ) : (
          <PanelCampanias filtros={filtros} cambiar={cambiarFiltros} abrir={elegir} />
        ))}
      {pestania === 'Comparar' && <PanelComparar />}
      {pestania === 'Inventario' && <PanelInventario />}
      {pestania === 'Predicción' && (
        <PanelPrediccion key={idPrediccion ?? 'seleccionar'} inicial={idPrediccion} />
      )}
      {pestania === 'Patrones' && <PanelPatrones abrir={abrirCampania} />}
      {visitadas.includes('Asistente') && (
        <div hidden={pestania !== 'Asistente'}>
          <PanelAsistente activo={pestania === 'Asistente'} />
        </div>
      )}
      {visitadas.includes('Reportes') && (
        <div hidden={pestania !== 'Reportes'}>
          <PanelReportes activo={pestania === 'Reportes'} />
        </div>
      )}
    </section>
  );
}
