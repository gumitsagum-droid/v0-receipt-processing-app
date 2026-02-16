import { neon } from '@neondatabase/serverless'
import { list } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)

async function seedReceipts() {
  try {
    // 1. Read receipts and users from Blob
    console.log('=== READING DATA FROM BLOB ===')
    const { blobs } = await list({ prefix: 'data/' })
    const receiptsBlob = blobs.find(b => b.pathname === 'data/receipts.json')
    const usersBlob = blobs.find(b => b.pathname === 'data/users.json')
    
    if (!receiptsBlob) {
      console.log('No receipts.json found')
      return
    }
    
    const resp = await fetch(receiptsBlob.downloadUrl, { cache: 'no-store' })
    const receiptsData = await resp.json()
    console.log('Found', receiptsData.receipts.length, 'receipts in Blob')
    
    // 2. Read blob users to get email by old user ID
    const blobUserEmailMap = {}
    if (usersBlob) {
      const usersResp = await fetch(usersBlob.downloadUrl, { cache: 'no-store' })
      const usersData = await usersResp.json()
      for (const bu of usersData.users) {
        blobUserEmailMap[bu.id] = bu.email
        console.log('  Blob user:', bu.id, '->', bu.email)
      }
    }
    
    // 3. Get Neon users to map email -> new UUID
    console.log('\n=== GETTING USERS FROM NEON ===')
    const neonUsers = await sql`SELECT id, email FROM users`
    console.log('Found', neonUsers.length, 'users in Neon')
    
    const emailToNeonId = {}
    for (const u of neonUsers) {
      emailToNeonId[u.email] = u.id
    }
    
    // Build mapping: old blob userId -> new neon userId (via email)
    const userIdMap = {}
    for (const [oldId, email] of Object.entries(blobUserEmailMap)) {
      if (emailToNeonId[email]) {
        userIdMap[oldId] = emailToNeonId[email]
        console.log('  Map:', oldId, '->', emailToNeonId[email], '(' + email + ')')
      }
    }
    
    // 4. Insert receipts using correct column names from schema
    console.log('\n=== INSERTING RECEIPTS ===')
    let inserted = 0
    let skipped = 0
    
    for (const r of receiptsData.receipts) {
      const newUserId = userIdMap[r.userId]
      if (!newUserId) {
        console.log('  SKIP receipt', r.id, '- no user mapping for userId:', r.userId, 'email:', blobUserEmailMap[r.userId])
        skipped++
        continue
      }
      
      // image_urls is a text[] array in postgres
      const imageUrls = r.images || []
      
      const receiptId = r.id || (Date.now().toString() + '-' + Math.random().toString(36).slice(2))
      
      await sql`INSERT INTO receipts (
        id, old_id, user_id, user_name, store_name, amount, receipt_number, date,
        observatii_lucrare, avans_decont, image_urls, status, card_firma,
        modified_by, modified_by_color, modified_at,
        created_at
      ) VALUES (
        ${receiptId}, ${r.id}, ${newUserId}, ${r.userName || null}, ${r.store || null}, ${r.amount || 0}, ${r.receiptNumber || null}, ${r.date || null},
        ${r.observations || null}, ${r.avansDecont || null}, ${imageUrls}, ${r.status || 'completed'}, ${r.cardFirma || null},
        ${r.modifiedBy || null}, ${r.modifiedByColor || null}, ${r.modifiedAt || null},
        ${r.createdAt || new Date().toISOString()}
      )`
      
      console.log('  OK:', r.id, '| Store:', r.store, '| Amount:', r.amount, '| Images:', imageUrls.length)
      inserted++
    }
    
    console.log('\n=== DONE ===')
    console.log('Inserted:', inserted, 'receipts')
    console.log('Skipped:', skipped, 'receipts')
    
  } catch (error) {
    console.error('ERROR:', error)
  }
}

seedReceipts()
