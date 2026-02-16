import { neon } from '@neondatabase/serverless'
import { list } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)

async function fixReceipts() {
  try {
    // 1. Read correct data from Blob
    console.log('=== READING FROM BLOB ===')
    const { blobs } = await list({ prefix: 'data/' })
    const receiptsBlob = blobs.find(b => b.pathname === 'data/receipts.json')
    
    const resp = await fetch(receiptsBlob.downloadUrl, { cache: 'no-store' })
    const receiptsData = await resp.json()
    console.log('Found', receiptsData.receipts.length, 'receipts in Blob')
    
    // 2. Get existing receipts from Neon
    const neonReceipts = await sql`SELECT id, old_id FROM receipts`
    console.log('Found', neonReceipts.length, 'receipts in Neon')
    
    // Build map: old_id -> exists in neon
    const existingOldIds = new Set(neonReceipts.map(r => r.old_id))
    
    // 3. UPDATE existing receipts with correct field values from Blob
    console.log('\n=== UPDATING EXISTING RECEIPTS ===')
    let updated = 0
    
    for (const r of receiptsData.receipts) {
      if (!existingOldIds.has(r.id)) {
        console.log('  SKIP (not in Neon):', r.id)
        continue
      }
      
      const imageUrls = r.imageUrl ? [r.imageUrl] : []
      
      await sql`UPDATE receipts SET
        store_name = ${r.storeName || null},
        image_urls = ${imageUrls},
        card_firma = ${r.cardFirma || null},
        user_name = ${r.userName || null}
      WHERE old_id = ${r.id}`
      
      console.log('  UPDATED:', r.userName, '|', r.storeName, '|', r.amount, 'RON |', imageUrls.length, 'img')
      updated++
    }
    
    // 4. Check for missing receipts that need INSERT (the skipped one)
    console.log('\n=== CHECKING MISSING RECEIPTS ===')
    const usersBlob = blobs.find(b => b.pathname === 'data/users.json')
    const usersResp = await fetch(usersBlob.downloadUrl, { cache: 'no-store' })
    const usersData = await usersResp.json()
    
    const blobIdToEmail = {}
    for (const bu of usersData.users) {
      blobIdToEmail[bu.id] = bu.email
    }
    
    const neonUsers = await sql`SELECT id, email FROM users`
    const emailToNeonId = {}
    for (const u of neonUsers) {
      emailToNeonId[u.email] = u.id
    }
    
    let inserted = 0
    for (const r of receiptsData.receipts) {
      if (existingOldIds.has(r.id)) continue
      
      const email = blobIdToEmail[r.userId]
      const newUserId = email ? emailToNeonId[email] : null
      if (!newUserId) {
        console.log('  CANNOT INSERT:', r.id, '- user not found:', r.userId, email)
        continue
      }
      
      const imageUrls = r.imageUrl ? [r.imageUrl] : []
      
      await sql`INSERT INTO receipts (
        id, old_id, user_id, user_name, store_name, amount, receipt_number, date,
        observatii_lucrare, avans_decont, image_urls, status, card_firma,
        modified_by, modified_by_color, modified_at, created_at
      ) VALUES (
        ${r.id}, ${r.id}, ${newUserId}, ${r.userName || null}, ${r.storeName || null}, ${r.amount || 0}, ${r.receiptNumber || null}, ${r.date || null},
        ${null}, ${r.avansDecont || null}, ${imageUrls}, ${'completed'}, ${r.cardFirma || null},
        ${r.modifiedBy || null}, ${r.modifiedByColor || null}, ${r.modifiedAt || null}, ${r.createdAt || new Date().toISOString()}
      )`
      console.log('  INSERTED:', r.userName, '|', r.storeName, '|', r.amount, 'RON')
      inserted++
    }
    
    console.log('\n=== DONE ===')
    console.log('Updated:', updated)
    console.log('Inserted:', inserted)
    
  } catch (error) {
    console.error('ERROR:', error)
  }
}

fixReceipts()
