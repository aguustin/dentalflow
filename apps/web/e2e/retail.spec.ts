import { expect, test } from '@playwright/test'

/**
 * Main happy path of the clothing store vertical:
 * register → product with variants → barcode + stock on a variant → scan at the POS → paid.
 */
test('clothing store: variants, barcode and point-of-sale checkout', async ({ page }) => {
  const id = Date.now()
  const slug = `tienda-${id}`
  const barcode = `779${String(id).slice(-10)}`

  await page.goto('/register')
  await page.getByLabel('Rubro').selectOption({ label: 'Tienda de ropa' })
  await page.getByLabel('Nombre del negocio').fill(`Tienda ${id}`)
  await page.getByLabel(/^Identificador/).fill(slug)
  await page.getByLabel('Nombre', { exact: true }).fill('Lucía')
  await page.getByLabel('Apellido').fill('Ventas')
  await page.getByLabel('Email').fill(`owner@${slug}.test`)
  await page.getByLabel('Contraseña').fill('secret123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Home of the retail vertical is the POS
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()

  // ── Product with variants ──────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Catálogo' }).click()
  await page.getByRole('link', { name: 'Nuevo ítem' }).click()
  await page.getByLabel(/Tiene variantes/).check()
  await page.getByLabel(/^Nombre/).fill('Remera básica')
  await page.getByLabel(/^Precio base/).fill('12.000')
  await page.getByLabel(/^Prefijo de SKU/).fill('REM')
  await page.getByLabel('Marca').fill('Propia')
  await page.getByRole('button', { name: 'Crear y generar variantes' }).click()

  await expect(page.getByRole('heading', { name: 'Generar variantes' })).toBeVisible()
  await page.getByLabel('Valores del eje 1').fill('S, M')
  await page.getByLabel('Valores del eje 2').fill('Negro')
  await page.getByRole('button', { name: 'Generar variantes' }).click()
  await expect(page.getByText('Se crearon 2 variante(s).')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'REM-M-NEGRO' })).toBeVisible()

  // ── Barcode + stock control on the M / Negro variant ───────────────────────
  await page.getByRole('link', { name: 'M / Negro' }).click()
  await expect(page.getByText('Variante: M / Negro')).toBeVisible()
  await page.getByLabel('Código de barras').fill(barcode)
  await page.getByLabel('Controlar stock').check()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible()

  await page.getByRole('link', { name: 'Inventario' }).click()
  await page.getByRole('link', { name: 'Remera básica · M / Negro' }).click()
  await page.getByLabel('Unidades recibidas').fill('5')
  await page.getByRole('button', { name: 'Sumar al stock' }).click()
  await expect(page.locator('.stock-now')).toContainText('5')

  // ── Scan at the POS and charge ─────────────────────────────────────────────
  await page.getByRole('link', { name: 'Punto de venta' }).click()
  const scan = page.getByLabel('Código o producto')
  await scan.fill(barcode)
  await scan.press('Enter')
  await expect(page.getByRole('cell', { name: 'Remera básica · M / Negro' })).toBeVisible()
  await scan.fill(barcode) // scanning again adds one more unit
  await scan.press('Enter')
  await expect(page.getByLabel('Cantidad de Remera básica · M / Negro')).toHaveValue('2')

  await page.getByLabel('Recibido').fill('30000')
  await expect(page.getByText('Vuelto: $ 6.000,00')).toBeVisible()
  await page.getByRole('button', { name: /^Cobrar/ }).click()
  await expect(page.getByText(/Venta #1 cobrada/)).toBeVisible()
  await page.screenshot({ path: 'test-results/pos.png', fullPage: true })

  await page.getByRole('link', { name: 'Inventario' }).click()
  await expect(page.getByRole('row', { name: /M \/ Negro/ })).toContainText('3')
})
