import { sql } from './db'
import type { Receipt } from './types'
import { getCardFirma } from './card-mapping'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function rowToReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    amount: Number(row.amount) || 0,
    storeName: (row.store_name as string) || '',
    date: (row.date as string) || '',
    receiptNumber: (row.receipt_number as string) || '',
    imageUrl: Array.isArray(row.image_urls) && (row.image_urls as string[]).length > 0 
      ? (row.image_urls as string[])[0] 
      : '',
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
    cardFirma: row.card_firma as string || getCardFirma(row.user_name as string || ''),
    avansDecont: row.avans_decont as string | undefined,
    avansDate: row.avans_date as string | undefined,
    observatiiLucrare: row.observatii_lucrare as string | undefined,
    modifiedBy: row.modified_by as string | undefined,
    modifiedByColor: row.modified_by_color as string | undefined,
    modifiedAt: row.modified_at ? new Date(row.modified_at as string).toISOString() : undefined,
  }
}

export async function getReceiptsData(): Promise<{ receipts: Receipt[] }> {
  const result = await sql`SELECT * FROM receipts ORDER BY created_at DESC`
  return { receipts: result.map(rowToReceipt) }
}

export async function createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
  const id = generateId()
  const imageUrls = receipt.imageUrl ? [receipt.imageUrl] : []
  
  const result = await sql`
    INSERT INTO receipts (id, user_id, user_name, store_name, amount, receipt_number, date, image_urls, status, card_firma, avans_decont, observatii_lucrare, modified_by, modified_by_color, modified_at)
    VALUES (${id}, ${receipt.userId}::uuid, ${receipt.userName}, ${receipt.storeName}, ${receipt.amount}, ${receipt.receiptNumber}, ${receipt.date}, ${imageUrls}, 'completed', ${receipt.cardFirma || null}, ${receipt.avansDecont || null}, ${receipt.observatiiLucrare || null}, ${receipt.modifiedBy || null}, ${receipt.modifiedByColor || null}, ${receipt.modifiedAt || null})
    RETURNING *
  `
  
  return rowToReceipt(result[0])
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const result = await sql`SELECT * FROM receipts ORDER BY created_at DESC`
  return result.map(rowToReceipt)
}

export async function getReceiptsByUserId(userId: string): Promise<Receipt[]> {
  const result = await sql`SELECT * FROM receipts WHERE user_id = ${userId}::uuid ORDER BY created_at DESC`
  return result.map(rowToReceipt)
}

export async function deleteReceipt(receiptId: string, imageUrl?: string): Promise<boolean> {
  const result = await sql`DELETE FROM receipts WHERE id = ${receiptId} RETURNING id`
  
  if (result.length === 0) return false
  
  // Try to delete image from Blob if URL provided
  if (imageUrl) {
    try {
      const { del } = await import('@vercel/blob')
      await del(imageUrl)
    } catch {
      // Image might not exist or blob might be blocked
    }
  }
  
  return true
}

export async function updateReceipt(
  receiptId: string, 
  updates: Partial<Pick<Receipt, 'amount' | 'storeName' | 'date' | 'receiptNumber' | 'cardFirma' | 'avansDecont' | 'avansDate' | 'observatiiLucrare' | 'modifiedBy' | 'modifiedByColor' | 'modifiedAt'>>
): Promise<Receipt | null> {
  // Build dynamic update
  const setClauses: string[] = []
  const values: unknown[] = []
  
  if (updates.amount !== undefined) { setClauses.push('amount'); values.push(updates.amount) }
  if (updates.storeName !== undefined) { setClauses.push('store_name'); values.push(updates.storeName) }
  if (updates.date !== undefined) { setClauses.push('date'); values.push(updates.date) }
  if (updates.receiptNumber !== undefined) { setClauses.push('receipt_number'); values.push(updates.receiptNumber) }
  if (updates.cardFirma !== undefined) { setClauses.push('card_firma'); values.push(updates.cardFirma) }
  if (updates.avansDecont !== undefined) { setClauses.push('avans_decont'); values.push(updates.avansDecont) }
  if (updates.avansDate !== undefined) { setClauses.push('avans_date'); values.push(updates.avansDate) }
  if (updates.observatiiLucrare !== undefined) { setClauses.push('observatii_lucrare'); values.push(updates.observatiiLucrare) }
  if (updates.modifiedBy !== undefined) { setClauses.push('modified_by'); values.push(updates.modifiedBy) }
  if (updates.modifiedByColor !== undefined) { setClauses.push('modified_by_color'); values.push(updates.modifiedByColor) }
  if (updates.modifiedAt !== undefined) { setClauses.push('modified_at'); values.push(updates.modifiedAt) }
  
  if (setClauses.length === 0) return null
  
  // Use individual update queries for each field to avoid SQL injection
  for (let i = 0; i < setClauses.length; i++) {
    const col = setClauses[i]
    const val = values[i]
    if (col === 'amount') await sql`UPDATE receipts SET amount = ${val as number} WHERE id = ${receiptId}`
    if (col === 'store_name') await sql`UPDATE receipts SET store_name = ${val as string} WHERE id = ${receiptId}`
    if (col === 'date') await sql`UPDATE receipts SET date = ${val as string} WHERE id = ${receiptId}`
    if (col === 'receipt_number') await sql`UPDATE receipts SET receipt_number = ${val as string} WHERE id = ${receiptId}`
    if (col === 'card_firma') await sql`UPDATE receipts SET card_firma = ${val as string} WHERE id = ${receiptId}`
    if (col === 'avans_decont') await sql`UPDATE receipts SET avans_decont = ${val as string} WHERE id = ${receiptId}`
    if (col === 'avans_date') await sql`UPDATE receipts SET avans_date = ${val as string} WHERE id = ${receiptId}`
    if (col === 'observatii_lucrare') await sql`UPDATE receipts SET observatii_lucrare = ${val as string} WHERE id = ${receiptId}`
    if (col === 'modified_by') await sql`UPDATE receipts SET modified_by = ${val as string} WHERE id = ${receiptId}`
    if (col === 'modified_by_color') await sql`UPDATE receipts SET modified_by_color = ${val as string} WHERE id = ${receiptId}`
    if (col === 'modified_at') await sql`UPDATE receipts SET modified_at = ${val as string} WHERE id = ${receiptId}`
  }
  
  const result = await sql`SELECT * FROM receipts WHERE id = ${receiptId}`
  if (result.length === 0) return null
  return rowToReceipt(result[0])
}

export async function saveReceiptsData(): Promise<void> {
  // No-op for Neon - kept for compatibility if anything calls it
}
