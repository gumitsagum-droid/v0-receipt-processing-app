import { list } from '@vercel/blob'

async function readVacationData() {
  try {
    const { blobs } = await list({ prefix: 'data/' })
    
    // Vacation settings
    const settingsBlob = blobs.find(b => b.pathname === 'data/vacation-settings.json')
    if (settingsBlob) {
      const resp = await fetch(settingsBlob.downloadUrl, { cache: 'no-store' })
      const data = await resp.json()
      console.log('=== VACATION SETTINGS ===')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log('No vacation-settings.json found')
    }
    
    // Vacations
    const vacationsBlob = blobs.find(b => b.pathname === 'data/vacations.json')
    if (vacationsBlob) {
      const resp = await fetch(vacationsBlob.downloadUrl, { cache: 'no-store' })
      const data = await resp.json()
      console.log('\n=== VACATIONS ===')
      console.log('Total vacations:', data.vacations?.length || 0)
      for (const v of (data.vacations || [])) {
        console.log(JSON.stringify(v))
      }
    } else {
      console.log('No vacations.json found')
    }
    
    // Check all blobs for vacation images
    console.log('\n=== ALL BLOBS WITH VACATION ===')
    const allBlobs = await list()
    for (const b of allBlobs.blobs) {
      if (b.pathname.includes('vacation') || b.pathname.includes('concedi')) {
        console.log(b.pathname, '->', b.downloadUrl)
      }
    }
    
  } catch (error) {
    console.error('ERROR:', error)
  }
}

readVacationData()
