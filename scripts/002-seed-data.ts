import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'decontufr-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function seedData() {
  console.log('=== SEEDING USERS ===')
  
  const users = [
    { name: 'Xenia', email: 'gumitsagum@gmail.com', plainPassword: 'gummy1234', role: 'admin', accessLevel: 3, adminColor: '#ef4444', createdAt: '2026-02-03T14:14:51.779Z' },
    { name: 'Dragoi Dragos-Ioan', email: 'dragos.dragoi@ultrafilter.ro', plainPassword: 'Erinstein.24', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-06T09:22:57.614Z' },
    { name: 'Calin Totoianu', email: 'calin.totoianu@ultrafilter.ro', plainPassword: 'UFRUFR2026', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-06T09:22:57.614Z' },
    { name: 'Cristina Timaru', email: 'cristina.timaru@ultrafilter.ro', plainPassword: 'ultrafilter2020@', role: 'admin', accessLevel: 2, adminColor: '#ec4899', createdAt: '2026-02-06T09:22:57.615Z' },
    { name: 'Covrig Stelian', email: 'stelian.covrig@ultrafilter.ro', plainPassword: 'Stelian12#', role: 'admin', accessLevel: 2, adminColor: '#22c55e', createdAt: '2026-02-06T09:36:06.291Z' },
    { name: 'Moroianu Marius-Mihai', email: 'mihai.moroianu@ultrafilter.ro', plainPassword: '@Honda20212', role: 'admin', accessLevel: 2, adminColor: '#06b6d4', createdAt: '2026-02-09T07:33:49.413Z' },
    { name: 'Gavrilă Mihail', email: 'mihai.gavrila@ultrafilter.ro', plainPassword: 'Motoreta95@', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-09T08:58:58.542Z' },
    { name: 'Moroianu Marcel', email: 'marcel.moroianu@ultrafilter.ro', plainPassword: 'Mmc251259#', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-09T10:17:19.605Z' },
    { name: 'Patko Alin', email: 'alin.patko@ultrafilter.ro', plainPassword: 'motorola', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-13T07:27:22.278Z' },
    { name: 'Victor Vajoi', email: 'victor.vajoi@ultrafilter.ro', plainPassword: 'r7462k9B', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-13T10:34:38.518Z' },
    { name: 'Victor Bobes', email: 'victor.bobes@ultrafilter.ro', plainPassword: 'alandalAx@ciuC1u', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-13T12:38:34.128Z' },
    { name: 'Bogdan Beita', email: 'bogdan.beita@ultrafilter.ro', plainPassword: '1Download1', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-13T14:04:00.948Z' },
    { name: 'Mihai Hutanu', email: 'mihaihutanu445@gmail.com', plainPassword: 'Mihaihutanu445', role: 'user', accessLevel: 1, adminColor: null, createdAt: '2026-02-13T14:38:41.535Z' },
  ]
  
  // Read original user IDs from Blob to map receipts correctly
  const blobUsersRes = await fetch('https://iqzrjancukk2mjgt.public.blob.vercel-storage.com/data/users.json', { cache: 'no-store' })
  const blobUsersData = await blobUsersRes.json()
  
  // Map original blob user ID to new neon user ID
  const userIdMap = {}
  
  for (const u of users) {
    const hashedPw = await hashPassword(u.plainPassword)
    const result = await sql`
      INSERT INTO users (email, name, password, plain_password, role, access_level, admin_color, created_at)
      VALUES (${u.email}, ${u.name}, ${hashedPw}, ${u.plainPassword}, ${u.role}, ${u.accessLevel}, ${u.adminColor}, ${u.createdAt})
      RETURNING id
    `
    const newId = result[0].id
    // Find original blob user with same email
    const blobUser = blobUsersData.users.find((bu) => bu.email === u.email)
    if (blobUser) {
      userIdMap[blobUser.id] = newId
    }
    console.log(`  User: ${u.name} (${u.email}) -> ID: ${newId} | Password: ${u.plainPassword}`)
  }
  
  console.log('\n=== SEEDING RECEIPTS ===')
  
  // Read receipts from Blob
  const blobReceiptsRes = await fetch('https://iqzrjancukk2mjgt.public.blob.vercel-storage.com/data/receipts.json', { cache: 'no-store' })
  const blobReceiptsData = await blobReceiptsRes.json()
  
  for (const r of blobReceiptsData.receipts) {
    const newUserId = userIdMap[r.userId]
    if (!newUserId) {
      console.log(`  SKIP receipt ${r.id} - no user mapping for ${r.userId}`)
      continue
    }
    
    // Images are stored as URLs - they stay in Blob and remain accessible
    const imageUrls = JSON.stringify(r.imageUrls || [])
    
    await sql`
      INSERT INTO receipts (
        old_id, user_id, user_name, date, receipt_number, amount, store_name,
        image_urls, card_firma, status, modified_by, modified_by_color, modified_at,
        avans_decont, observatii_lucrare, created_at
      ) VALUES (
        ${r.id}, ${newUserId}, ${r.userName || ''}, ${r.date || ''}, ${r.receiptNumber || ''},
        ${r.amount || 0}, ${r.storeName || ''}, ${imageUrls}, ${r.cardFirma || null},
        ${r.status || 'pending'}, ${r.modifiedBy || null}, ${r.modifiedByColor || null},
        ${r.modifiedAt || null}, ${r.avansDecont || null}, ${r.observatiiLucrare || null},
        ${r.createdAt || new Date().toISOString()}
      )
    `
    console.log(`  Receipt: ${r.userName} | ${r.storeName} | ${r.amount} RON | Images: ${(r.imageUrls || []).length}`)
  }
  
  console.log('\n=== SEEDING VACATION SETTINGS ===')
  
  // Check if vacation settings exist in blob
  try {
    const { blobs } = await (await import('@vercel/blob')).list({ prefix: 'data/vacation' })
    for (const blob of blobs) {
      console.log(`  Found vacation blob: ${blob.pathname}`)
      const res = await fetch(blob.url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        console.log(`  Data:`, JSON.stringify(data))
        
        // Extract userId from pathname (e.g. data/vacation-settings-USERID.json)
        const match = blob.pathname.match(/vacation-settings-(.+)\.json/)
        if (match) {
          const oldUserId = match[1]
          const newUserId = userIdMap[oldUserId]
          if (newUserId && data) {
            await sql`
              INSERT INTO vacation_settings (user_id, total_alocat, an_anterior)
              VALUES (${newUserId}, ${data.totalAlocat || 21}, ${data.anAnterior || 0})
              ON CONFLICT (user_id) DO UPDATE SET total_alocat = ${data.totalAlocat || 21}, an_anterior = ${data.anAnterior || 0}
            `
            console.log(`  Vacation settings saved for user ${newUserId}`)
          }
        }
      }
    }
  } catch (e) {
    console.log('  No vacation settings found or error:', e)
  }
  
  // Check for vacations
  try {
    const { blobs } = await (await import('@vercel/blob')).list({ prefix: 'data/vacations' })
    for (const blob of blobs) {
      console.log(`  Found vacations blob: ${blob.pathname}`)
      const res = await fetch(blob.url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.vacations && Array.isArray(data.vacations)) {
          for (const v of data.vacations) {
            const newUserId = userIdMap[v.userId]
            if (newUserId) {
              await sql`
                INSERT INTO vacations (user_id, type, start_date, end_date, days, created_at)
                VALUES (${newUserId}, ${v.type || 'legal'}, ${v.startDate}, ${v.endDate}, ${v.days || 0}, ${v.createdAt || new Date().toISOString()})
              `
              console.log(`  Vacation: user ${newUserId} | ${v.type} | ${v.startDate} - ${v.endDate}`)
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('  No vacations found or error:', e)
  }
  
  console.log('\n=== SEED COMPLETE ===')
  
  // Verify counts
  const userCount = await sql`SELECT COUNT(*) as count FROM users`
  const receiptCount = await sql`SELECT COUNT(*) as count FROM receipts`
  const vacationCount = await sql`SELECT COUNT(*) as count FROM vacations`
  
  console.log(`Total users: ${userCount[0].count}`)
  console.log(`Total receipts: ${receiptCount[0].count}`)
  console.log(`Total vacations: ${vacationCount[0].count}`)
}

seedData().catch(console.error)
