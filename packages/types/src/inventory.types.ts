/** Inventory: stock of products with stock control. */

export type StockMovementType = 'PURCHASE' | 'ADJUSTMENT' | 'SALE' | 'SALE_VOID'

export interface InventoryItem {
  id: string
  name: string
  sku: string | null
  stockQuantity: number
  /** Held by approved work orders */
  reservedQuantity: number
  /** stockQuantity - reservedQuantity */
  available: number
  minStock: number | null
  isActive: boolean
  isLow: boolean
}

export interface StockMovement {
  id: string
  type: StockMovementType
  /** Signed change */
  quantity: number
  balanceAfter: number
  note: string | null
  createdAt: string
  sale: { id: string; number: number } | null
}

export interface InventoryItemDetail extends InventoryItem {
  movements: StockMovement[]
}
