export function AvisoOrientativo({ aviso }: { aviso: string }) {
  return (
    <aside className="ana-aviso">
      <strong>Orientativo</strong>
      <p>{aviso}</p>
    </aside>
  );
}
