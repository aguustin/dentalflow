import { expect, test } from '@playwright/test'

/**
 * Main happy path of the dental vertical:
 * register a business → land on the agenda → create a patient → book an appointment.
 * The only UI test of Phase 1 (see docs/ROADMAP.md, testing strategy).
 */
test('register, create a patient and book an appointment', async ({ page }) => {
  const id = Date.now()
  const slug = `smoke-${id}`
  const patient = `Paciente Smoke ${id}`

  // ── Register ───────────────────────────────────────────────────────────────
  await page.goto('/register')
  await expect(page.getByLabel('Rubro')).toHaveValue('dental')
  await page.getByLabel('Nombre del negocio').fill(`Clínica Smoke ${id}`)
  await expect(page.getByLabel(/^Identificador/)).toHaveValue(`clinica-smoke-${id}`)
  await page.getByLabel(/^Identificador/).fill(slug)
  await page.getByLabel('Nombre', { exact: true }).fill('Ana')
  await page.getByLabel('Apellido').fill('Prueba')
  await page.getByLabel('Email').fill(`owner@${slug}.test`)
  await page.getByLabel('Contraseña').fill('secret123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Dental home module is the agenda; menu uses the vertical's terminology
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pacientes' })).toBeVisible()

  // ── Create patient (with a vertical-specific attribute) ───────────────────
  await page.getByRole('link', { name: 'Pacientes' }).click()
  await expect(page.getByText('Todavía no cargaste pacientes.')).toBeVisible()
  await page.getByRole('link', { name: 'Nuevo paciente' }).click()
  await page.getByLabel(/^Nombre/).fill(patient)
  await page.getByLabel('Obra social / prepaga').fill('OSDE')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('link', { name: patient })).toBeVisible()

  // ── Book appointment today at 10:00 (always inside the visible week) ──────
  await page.getByRole('link', { name: 'Agenda' }).click()
  await page.getByRole('button', { name: 'Nuevo turno', exact: true }).click()
  await page.getByPlaceholder('Buscar por nombre…').fill('Smoke')
  await page.getByRole('button', { name: patient }).click()
  await page.getByLabel(/^Motivo/).fill('Control anual')
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  await page.getByLabel('Fecha').fill(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)
  await page.getByLabel('Hora').fill('10:00')
  await page.getByRole('button', { name: 'Guardar' }).click()

  const appointment = page.locator('.day.today .appt', { hasText: patient })
  await expect(appointment).toBeVisible()
  await expect(appointment).toContainText('Control anual')
})
