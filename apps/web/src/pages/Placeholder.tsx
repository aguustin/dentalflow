export function Placeholder({ title, step }: { title: string; step: number }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">Pendiente — paso {step} de la Fase 1.</p>
    </section>
  )
}
