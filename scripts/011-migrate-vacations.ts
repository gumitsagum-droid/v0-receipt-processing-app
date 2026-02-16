import { neon } from '@neondatabase/serverless'
import { list } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL)

async function migrateVacations() {
  try {
    // 1. Fetch vacations.json and vacation-settings.json from Blob root
    console.log('=== READING BLOB DATA ===')
    const { blobs } = await list()
    
    const vacationsBlob = blobs.find(b => b.pathname === 'vacations.json')
    const settingsBlob = blobs.find(b => b.pathname === 'vacation-settings.json')
    
    console.log('vacations.json found:', !!vacationsBlob)
    console.log('vacation-settings.json found:', !!settingsBlob)
    
    // 2. Read vacation settings
    let settings = null
    if (settingsBlob) {
      const resp = await fetch(settingsBlob.downloadUrl, { cache: 'no-store' })
      settings = await resp.json()
      console.log('\n=== VACATION SETTINGS ===')
      console.log(JSON.stringify(settings, null, 2))
    }
    
    // 3. Read vacations
    let vacationsData = null
    if (vacationsBlob) {
      const resp = await fetch(vacationsBlob.downloadUrl, { cache: 'no-store' })
      vacationsData = await resp.json()
      console.log('\n=== VACATIONS ===')
      console.log('Total vacations:', vacationsData.vacations?.length || 0)
      for (const v of (vacationsData.vacations || [])) {
        console.log('  -', v.userName, '|', v.type, '|', v.days, 'zile |', v.startDate, '-', v.endDate, '| imageUrl:', v.imageUrl || 'NONE')
      }
    }

    // 4. Get Neon users for mapping (handle name variants)
    console.log('\n=== NEON USERS ===')
    const neonUsers = await sql`SELECT id, name, email FROM users`
    const nameToId = {}
    for (const u of neonUsers) {
      nameToId[u.name] = u.id
      nameToId[u.name.trim()] = u.id
      nameToId[u.name.toLowerCase()] = u.id
      nameToId[u.name.toLowerCase().trim()] = u.id
      console.log('  ', u.name, '->', u.id)
    }
    // Special mappings for Blob name variants
    nameToId['xenia'] = nameToId['Xenia']
    nameToId['xenia '] = nameToId['Xenia']
    nameToId['Cristina Timaru '] = nameToId['Cristina Timaru']

    // 5. Migrate vacation settings (anAnterior + totalAllocated)
    if (settings && settings.userSettings) {
      console.log('\n=== MIGRATING VACATION SETTINGS ===')
      for (const [userName, data] of Object.entries(settings.userSettings)) {
        const userId = nameToId[userName] || nameToId[userName.trim()]
        if (!userId) {
          console.log('  SKIP setting for', JSON.stringify(userName), '- user not found in Neon')
          continue
        }
        
        // For Xenia there are 2 entries ("xenia " with 14 and "Xenia" with 13) - take the higher one
        const anAnterior = data.anAnterior || 0
        const totalAllocated = data.totalAllocated || 21
        
        // Check if setting already exists
        const existing = await sql`SELECT id FROM vacation_settings WHERE user_id = ${userId}::uuid`
        
        if (existing.length > 0) {
          // Keep the higher anAnterior value (for duplicate Xenia entries)
          await sql`UPDATE vacation_settings SET an_anterior = GREATEST(an_anterior, ${anAnterior}), total_allocated = GREATEST(total_allocated, ${totalAllocated}) WHERE user_id = ${userId}::uuid`
          console.log('  UPDATED:', userName, '| anAnterior:', anAnterior, '| totalAllocated:', totalAllocated)
        } else {
          await sql`INSERT INTO vacation_settings (user_id, an_anterior, total_allocated, year) VALUES (${userId}::uuid, ${anAnterior}, ${totalAllocated}, 2026)`
          console.log('  INSERTED:', userName, '| anAnterior:', anAnterior, '| totalAllocated:', totalAllocated)
        }
      }
    }

    // 6. Migrate vacations with image URLs
    if (vacationsData && vacationsData.vacations) {
      console.log('\n=== MIGRATING VACATIONS ===')
      
      // Check what already exists
      const existingVacations = await sql`SELECT id FROM vacations`
      console.log('Existing vacations in Neon:', existingVacations.length)
      
      let inserted = 0
      let skipped = 0
      
      for (const v of vacationsData.vacations) {
        const userId = nameToId[v.userName] || nameToId[v.userName?.trim()]
        if (!userId) {
          console.log('  SKIP vacation for', JSON.stringify(v.userName), '- user not found')
          skipped++
          continue
        }
        
        // Check if this vacation already exists (by matching user, dates, type)
        const exists = await sql`SELECT id FROM vacations WHERE user_id = ${userId}::uuid AND start_date = ${v.startDate} AND end_date = ${v.endDate} AND type = ${v.type}`
        
        if (exists.length > 0) {
          // Update imageUrl if it was missing
          if (v.imageUrl) {
            await sql`UPDATE vacations SET image_url = ${v.imageUrl} WHERE id = ${exists[0].id}`
            console.log('  UPDATED image for:', v.userName, '|', v.type, '|', v.startDate, '-', v.endDate)
          } else {
            console.log('  ALREADY EXISTS:', v.userName, '|', v.type, '|', v.startDate, '-', v.endDate)
          }
          skipped++
          continue
        }
        
        // Use proper Neon user name, not Blob name with trailing spaces
        const neonUser = neonUsers.find(u => u.id === userId)
        const properName = neonUser ? neonUser.name : v.userName
        
        await sql`INSERT INTO vacations (user_id, user_name, type, days, start_date, end_date, image_url, created_at) 
                   VALUES (${userId}::uuid, ${properName}, ${v.type}, ${v.days}, ${v.startDate}, ${v.endDate}, ${v.imageUrl || null}, ${v.createdAt || new Date().toISOString()})`
        
        console.log('  INSERTED:', v.userName, '|', v.type, '|', v.days, 'zile |', v.startDate, '-', v.endDate, '| img:', v.imageUrl ? 'YES' : 'NO')
        inserted++
      }
      
      console.log('\n=== DONE ===')
      console.log('Inserted:', inserted)
      console.log('Skipped/Updated:', skipped)
    }

    // 7. Final verification
    console.log('\n=== VERIFICATION ===')
    const finalVacations = await sql`SELECT user_name, type, days, start_date, end_date, image_url FROM vacations ORDER BY user_name`
    console.log('Total vacations in Neon:', finalVacations.length)
    for (const v of finalVacations) {
      console.log('  ', v.user_name, '|', v.type, '|', v.days, 'zile |', v.start_date, '-', v.end_date, '| img:', v.image_url ? 'YES' : 'NO')
    }
    
    const finalSettings = await sql`SELECT u.name, vs.an_anterior, vs.total_allocated FROM vacation_settings vs JOIN users u ON u.id = vs.user_id ORDER BY u.name`
    console.log('\nTotal vacation settings in Neon:', finalSettings.length)
    for (const s of finalSettings) {
      console.log('  ', s.name, '| anAnterior:', s.an_anterior, '| totalAllocated:', s.total_allocated)
    }

  } catch (error) {
    console.error('ERROR:', error)
  }
}

migrateVacations()
