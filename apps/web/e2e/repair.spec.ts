import { expect, test } from '@playwright/test'

/**
 * Main happy path of the repair (mechanic) vertical:
 * register a shop → mechanic → part in the catalog → customer → intake with a new vehicle →
 * diagnosis → quote → approval → repair → ready → delivered.
 */
test('mechanic shop: intake, quote and deliver a work order', async ({ page }) => {
  const id = Date.now()
  const slug = `taller-${id}`

  // ── Register as a mechanic shop ────────────────────────────────────────────
  await page.goto('/register')
  await page.getByLabel('Rubro').selectOption({ label: 'Taller mecánico' })
  await page.getByLabel('Nombre del negocio').fill(`Taller ${id}`)
  await page.getByLabel(/^Identificador/).fill(slug)
  await page.getByLabel('Nombre', { exact: true }).fill('Beto')
  await page.getByLabel('Apellido').fill('Mecánico')
  await page.getByLabel('Email').fill(`owner@${slug}.test`)
  await page.getByLabel('Contraseña').fill('secret123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Home is the work order board; vertical vocabulary; no agenda/clinical
  await expect(page.getByRole('heading', { name: 'Órdenes de trabajo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mecánicos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Agenda' })).toHaveCount(0)

  // ── Setup: mechanic, a part, a customer ────────────────────────────────────
  await page.getByRole('link', { name: 'Mecánicos' }).click()
  await page.getByRole('link', { name: 'Nuevo mecánico' }).click()
  await page.getByLabel(/^Nombre/).fill('Carlos')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Carlos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Horario semanal' })).toHaveCount(0) // no agenda in this vertical

  await page.getByRole('link', { name: 'Catálogo' }).click()
  await page.getByRole('link', { name: 'Nuevo ítem' }).click()
  await page.getByLabel('Tipo').selectOption('PRODUCT')
  await page.getByLabel(/^Nombre/).fill('Filtro de aceite')
  await page.getByLabel(/^Precio/).fill('8.000')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('link', { name: 'Filtro de aceite' })).toBeVisible()

  await page.getByRole('link', { name: 'Clientes' }).click()
  await page.getByRole('link', { name: 'Nuevo cliente' }).click()
  await page.getByLabel(/^Nombre/).fill('Juan Pérez')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('link', { name: 'Juan Pérez' })).toBeVisible()

  // ── Intake with a new vehicle ──────────────────────────────────────────────
  await page.getByRole('link', { name: 'Órdenes de trabajo' }).click()
  await page.getByRole('link', { name: 'Nueva orden de trabajo' }).click()
  await page.getByPlaceholder('Buscar por nombre…').fill('Juan')
  await page.getByRole('button', { name: 'Juan Pérez' }).click()
  await page.getByRole('button', { name: '+ Nuevo vehículo' }).click()
  await page.getByLabel(/^Descripción corta/).fill('Ford Fiesta · AB123CD')
  await page.getByLabel(/^Patente/).fill('AB123CD')
  await page.getByLabel('Kilometraje').fill('98000')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()
  await expect(page.getByLabel('Vehículo')).toHaveValue(/.+/)
  await page.getByLabel(/asignado/).selectOption({ label: 'Carlos' })
  await page.getByLabel(/^Falla reportada/).fill('Service de 100.000 km')
  await page.getByRole('button', { name: 'Crear orden' }).click()

  await expect(page.getByRole('heading', { name: /Orden de trabajo #1/ })).toBeVisible()
  await expect(page.locator('.badge')).toHaveText('Recibido')

  // ── Diagnose and quote ─────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Pasar a diagnóstico' }).click()
  await page.getByPlaceholder('Agregar del catálogo…').fill('Filtro')
  await page.getByRole('button', { name: /Filtro de aceite/ }).click()
  await page.getByRole('button', { name: '+ Línea libre' }).click()
  await page.getByLabel('Descripción').last().fill('Mano de obra')
  await page.getByLabel('Precio unitario').last().fill('15000')
  await page.getByRole('button', { name: 'Guardar ítems' }).click()
  await expect(page.getByText('Total: $ 23.000,00')).toBeVisible()

  await page.getByRole('button', { name: 'Presentar presupuesto' }).click()
  await expect(page.getByText('Para modificar el presupuesto')).toBeVisible()

  // ── Approve → repair → ready → deliver ─────────────────────────────────────
  for (const step of ['Cliente aprobó', 'Iniciar reparación', 'Marcar listo', 'Entregar']) {
    await page.getByRole('button', { name: step }).click()
    await expect(page.getByRole('button', { name: step })).toHaveCount(0)
  }
  await expect(page.locator('.badge')).toHaveText('Entregado')
  await expect(page.locator('.notes li')).toHaveCount(7) // full history
  await page.screenshot({ path: 'test-results/work-order.png', fullPage: true })
})
