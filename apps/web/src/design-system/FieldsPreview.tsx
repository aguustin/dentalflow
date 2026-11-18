/** Dev-only showcase of form controls in every state (route /dev/campos). Switch the theme from the sidebar. */
export function FieldsPreview() {
  return (
    <div style={{ maxWidth: 880 }}>
      <h1>Campos de formulario</h1>
      <p className="muted">Muestra de estados. Pasá el mouse y usá Tab para ver hover y foco; cambiá el tema desde el menú.</p>

      <div className="card" style={{ maxWidth: 'none', marginTop: 16 }}>
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <div className="row">
            <label>
              Nombre
              <input defaultValue="María González" />
            </label>
            <label>
              Con placeholder
              <input placeholder="Ej.: Juan Pérez" />
            </label>
          </div>

          <div className="row">
            <label>
              Profesional
              <select defaultValue="2">
                <option value="1">Dra. Ana López</option>
                <option value="2">Dr. Martín Fernández — Clínica general</option>
                <option value="3">Lic. Sofía Ruiz</option>
              </select>
            </label>
            <label>
              Estado
              <select defaultValue="">
                <option value="" disabled>
                  Elegí una opción
                </option>
                <option>Agendado</option>
                <option>Confirmado</option>
              </select>
            </label>
          </div>

          <div className="row">
            <label>
              Fecha
              <input type="date" defaultValue="2026-11-18" />
            </label>
            <label>
              Hora
              <input type="time" defaultValue="09:30" />
            </label>
            <label>
              Cantidad
              <input type="number" defaultValue={2} className="num" />
            </label>
          </div>

          <input type="search" className="search" placeholder="Buscar por nombre, documento o teléfono" />

          <div className="row">
            <label>
              Email (con error)
              <input type="email" defaultValue="maria@" aria-invalid="true" />
              <span className="field-error">Ingresá un email válido.</span>
            </label>
            <label>
              Teléfono (con ayuda)
              <input placeholder="+54 9 11 1234-5678" />
              <span className="hint">Lo usamos para recordatorios de turnos.</span>
            </label>
          </div>

          <div className="row">
            <label>
              Deshabilitado
              <input defaultValue="No editable" disabled />
            </label>
            <label>
              Select deshabilitado
              <select disabled>
                <option>Plan Pro</option>
              </select>
            </label>
          </div>

          <label>
            Observaciones
            <textarea placeholder="Notas internas sobre el paciente" />
          </label>

          <div className="row" style={{ gap: 24 }}>
            <label className="checkbox">
              <input type="checkbox" defaultChecked /> Enviar recordatorio
            </label>
            <label className="checkbox">
              <input type="checkbox" /> Primera consulta
            </label>
            <label className="inline">
              <input type="radio" name="pay" defaultChecked /> Efectivo
            </label>
            <label className="inline">
              <input type="radio" name="pay" /> Tarjeta
            </label>
            <label className="checkbox">
              <input type="checkbox" disabled /> Deshabilitado
            </label>
          </div>

          <div className="actions">
            <button type="submit">Guardar</button>
            <button type="button" className="secondary">
              Cancelar
            </button>
            <button type="button" disabled>
              Deshabilitado
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
