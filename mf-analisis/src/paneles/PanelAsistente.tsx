import { useEffect, useState } from 'react';
import type { ResultadoAsistente } from '../modelos-ia';
import { preguntar } from '../servicios/ia';
import { etiqueta } from '../servicios/etiquetas';
import { usarTrabajo } from '../componentes/usar-trabajo';
import { EstadoTrabajo } from '../componentes/EstadoTrabajo';
import { AvisoOrientativo } from '../componentes/AvisoOrientativo';
function Intercambio({ pregunta, activo }: { pregunta: string; activo: boolean }) {
  const { solicitud, esperando, ejecutar } = usarTrabajo<ResultadoAsistente>(activo);
  const iniciar = () => void ejecutar((signal) => preguntar(pregunta, signal));
  useEffect(() => {
    iniciar();
  }, []);
  const resultado = solicitud.trabajo?.resultado;
  return (
    <article className="ana-seccion">
      <h3>{pregunta}</h3>
      <EstadoTrabajo
        solicitud={solicitud}
        esperando={esperando}
        consultar={() => void ejecutar()}
        reintentar={iniciar}
      />
      {resultado && (
        <>
          <p className="ana-respuesta">{resultado.respuesta}</p>
          <p>Agente: {etiqueta(resultado.agente)}</p>
          <AvisoOrientativo aviso={resultado.aviso} />
          {resultado.cifrasOmitidas > 0 && (
            <p>Se omitieron {resultado.cifrasOmitidas} cifras que no se pudieron verificar</p>
          )}
          <h4>Herramientas consultadas</h4>
          <ul>
            {resultado.herramientas.map((h, i) => (
              <li key={i}>
                {h.nombre}: {h.error ? 'Falló' : 'Consultada'}
                {h.error
                  ? ` · ${typeof h.error === 'string' ? h.error : JSON.stringify(h.error)}`
                  : ''}
              </li>
            ))}
          </ul>
          <details>
            <summary>Ver datos consultados</summary>
            {resultado.datos.map((d, i) => (
              <section key={i}>
                <h4>{d.herramienta}</h4>
                <pre>{JSON.stringify(d.resultado, null, 2)}</pre>
              </section>
            ))}
          </details>
        </>
      )}
    </article>
  );
}
export function PanelAsistente({ activo }: { activo: boolean }) {
  const [pregunta, cambiarPregunta] = useState('');
  const [conversacion, guardar] = useState<{ id: string; pregunta: string }[]>([]);
  function enviar() {
    if (pregunta.trim().length < 3 || pregunta.trim().length > 1000) return;
    guardar((c) => [...c, { id: crypto.randomUUID(), pregunta: pregunta.trim() }]);
    cambiarPregunta('');
  }
  return (
    <>
      <h2>Asistente</h2>
      <p>
        Pregunte sobre campañas o inventario. La conversación se conserva mientras Análisis siga
        abierto.
      </p>
      <div aria-live="polite">
        {conversacion.map((p) => (
          <Intercambio key={p.id} pregunta={p.pregunta} activo={activo} />
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <label>
          Pregunta
          <textarea
            value={pregunta}
            minLength={3}
            maxLength={1000}
            required
            onChange={(e) => cambiarPregunta(e.target.value)}
          />
        </label>
        <button disabled={pregunta.trim().length < 3} type="submit">
          Preguntar
        </button>
      </form>
    </>
  );
}
