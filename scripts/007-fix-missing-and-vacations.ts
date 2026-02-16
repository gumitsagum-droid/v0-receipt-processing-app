import { neon } from '@neondatabase/serverless'
import { list } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)

async function fixAll() {
  try {
    // 1. Insert the missing Calin Totoianu receipt
    console.log('=== INSERTING MISSING RECEIPT ===')
    const neonUsers = await sql`SELECT id, email FROM users`
    const calin = neonUsers.find(u => u.email === 'calin.totoianu@ultrafilter.ro')
    
    if (calin) {
      const imageUrl = 'https://iqzrjancukk2mjgt.public.blob.vercel-storage.com/receipts/139a9fd5-a06c-4077-a535-b95d644119b1/1770202302913-Bon%20baterie%20telecomanda%20Kuga%20B-17-2026.jpeg'
      
      await sql`INSERT INTO receipts (
        id, old_id, user_id, user_name, store_name, amount, receipt_number, date,
        observatii_lucrare, avans_decont, image_urls, status, card_firma,
        modified_by, modified_by_color, modified_at, created_at
      ) VALUES (
        ${'1770202306389-aiehkf7ev'}, ${'1770202306389-aiehkf7ev'}, ${calin.id}, ${'Calin Totoianu'}, ${'HORNBACH'}, ${4.98}, ${'13934003'}, ${'04.02.2026'},
        ${null}, ${'0'}, ${[imageUrl]}, ${'completed'}, ${''},
        ${'Covrig Stelian'}, ${'#22c55e'}, ${'2026-02-06T10:55:35.959Z'}, ${'2026-02-04T10:51:46.389Z'}
      )`
      console.log('  INSERTED: Calin Totoianu | HORNBACH | 4.98 RON')
    } else {
      console.log('  ERROR: Calin Totoianu not found in Neon')
    }
    
    // 2. Seed vacations
    console.log('\n=== READING VACATIONS FROM BLOB ===')
    const { blobs } = await list({ prefix: 'data/' })
    const vacBlob = blobs.find(b => b.pathname === 'data/vacations.json')
    const settingsBlob = blobs.find(b => b.pathname === 'data/vacation-settings.json')
    
    if (vacBlob) {
      const resp = await fetch(vacBlob.downloadUrl, { cache: 'no-store' })
      const vacData = await resp.json()
      console.log('Found', vacData.vacations ? vacData.vacations.length : 0, 'vacations')
      
      if (vacData.vacations && vacData.vacations.length > 0) {
        // Build user ID mapping
        const usersBlob = blobs.find(b => b.pathname === 'data/users.json')
        const usersResp = await fetch(usersBlob.downloadUrl, { cache: 'no-store' })
        const usersData = await usersResp.json()
        
        const blobIdToEmail = {}
        for (const bu of usersData.users) {
          blobIdToEmail[bu.id] = bu.email
        }
        const emailToNeonId = {}
        for (const u of neonUsers) {
          emailToNeonId[u.email] = u.id
        }
        
        for (const v of vacData.vacations) {
          const email = blobIdToEmail[v.userId]
          const newUserId = email ? emailToNeonId[email] : null
          if (!newUserId) {
            console.log('  SKIP vacation - no user for:', v.userId)
            continue
          }
          
          await sql`INSERT INTO vacations (
            id, user_id, user_name, type, start_date, end_date, days, status, created_at
          ) VALUES (
            ${v.id}, ${newUserId}, ${v.userName || null}, ${v.type || null}, ${v.startDate || null}, ${v.endDate || null}, ${v.days || 0}, ${v.status || 'approved'}, ${v.createdAt || new Date().toISOString()}
          )`
          console.log('  INSERTED vacation:', v.userName, v.type, v.days, 'days')
        }
      }
    } else {
      console.log('No vacations.json found')
    }
    
    // 3. Seed vacation settings
    console.log('\n=== READING VACATION SETTINGS ===')
    if (settingsBlob) {
      const resp = await fetch(settingsBlob.downloadUrl, { cache: 'no-store' })
      const settingsData = await resp.json()
      console.log('Settings data:', JSON.stringify(settingsData, null, 2))
      
      if (settingsData.settings) {
        for (const [userId, s] of Object.entries(settingsData.settings)) {
          // Find neon user for this old userId
          const usersBlob2 = blobs.find(b => b.pathname === 'data/users.json')
          const usersResp2 = await fetch(usersBlob2.downloadUrl, { cache: 'no-store' })
          const usersData2 = await usersResp2.json()
          
          const blobUser = usersData2.users.find(bu => bu.id === userId)
          if (!blobUser) {
            console.log('  SKIP setting - no blob user for:', userId)
            continue
          }
          const neonUser = neonUsers.find(nu => nu.email === blobUser.email)
          if (!neonUser) {
            console.log('  SKIP setting - no neon user for:', blobUser.email)
            continue
          }
          
          await sql`INSERT INTO vacation_settings (
            user_id, allocated_days, previous_year_days
          ) VALUES (
            ${neonUser.id}, ${s.allocatedDays || 21}, ${s.previousYearDays || 0}
          ) ON CONFLICT (user_id) DO UPDATE SET
            allocated_days = ${s.allocatedDays || 21},
            previous_year_days = ${s.previousYearDays || 0}`
          
          console.log('  INSERTED setting:', blobUser.email, '| Allocated:', s.allocatedDays, '| Previous:', s.previousYearDays)
        }
      }
    } else {
      console.log('No vacation-settings.json found')
    }
    
    // 4. Final count
    console.log('\n=== FINAL COUNTS ===')
    const rCount = await sql`SELECT COUNT(*) as c FROM receipts`
    const vCount = await sql`SELECT COUNT(*) as c FROM vacations`
    const vsCount = await sql`SELECT COUNT(*) as c FROM vacation_settings`
    console.log('Receipts:', rCount[0].c)
    console.log('Vacations:', vCount[0].c)
    console.log('Vacation Settings:', vsCount[0].c)
    console.log('Users:', neonUsers.length)
    
  } catch (error) {
    console.error('ERROR:', error)
  }
}

fixAll()
