import { list } from '@vercel/blob'

async function readAllData() {
  try {
    console.log('=== STEP 1: Listing all blobs ===')
    const { blobs } = await list({ prefix: 'data/' })
    console.log('Found', blobs.length, 'blobs in data/')
    
    for (const blob of blobs) {
      console.log(' -', blob.pathname, '(' + blob.size + ' bytes)')
    }
    
    // Try to read users.json
    const usersBlob = blobs.find(b => b.pathname === 'data/users.json')
    if (usersBlob) {
      console.log('\n=== STEP 2: Reading users.json ===')
      const response = await fetch(usersBlob.url, { cache: 'no-store' })
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Total users:', data.users.length)
        for (const user of data.users) {
          console.log(`  - ${user.name} | ${user.email} | role: ${user.role} | accessLevel: ${user.accessLevel} | plainPassword: ${user.plainPassword || 'N/A'} | adminColor: ${user.adminColor || 'none'} | createdAt: ${user.createdAt}`)
        }
      } else {
        const text = await response.text()
        console.log('ERROR reading users:', text)
      }
    }
    
    // Try to read receipts.json
    const receiptsBlob = blobs.find(b => b.pathname === 'data/receipts.json')
    if (receiptsBlob) {
      console.log('\n=== STEP 3: Reading receipts.json ===')
      const response = await fetch(receiptsBlob.url, { cache: 'no-store' })
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Total receipts:', data.receipts.length)
        for (const r of data.receipts) {
          console.log(`  - ID: ${r.id} | User: ${r.userName} | Date: ${r.date} | Store: ${r.storeName} | Amount: ${r.amount} | Image: ${r.imageUrl ? 'YES' : 'NO'} | avansDecont: ${r.avansDecont || ''} | observatiiLucrare: ${r.observatiiLucrare || ''}`)
        }
      } else {
        const text = await response.text()
        console.log('ERROR reading receipts:', text)
      }
    }
    
    // Try to read vacations.json
    const vacationsBlob = blobs.find(b => b.pathname === 'data/vacations.json')
    if (vacationsBlob) {
      console.log('\n=== STEP 4: Reading vacations.json ===')
      const response = await fetch(vacationsBlob.url, { cache: 'no-store' })
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Total vacations:', data.vacations ? data.vacations.length : 0)
        if (data.vacations) {
          for (const v of data.vacations) {
            console.log(`  - ${v.userName} | ${v.type} | ${v.startDate} - ${v.endDate} | ${v.days} days | status: ${v.status}`)
          }
        }
      } else {
        const text = await response.text()
        console.log('ERROR reading vacations:', text)
      }
    }
    
    // Try to read vacation-settings.json
    const settingsBlob = blobs.find(b => b.pathname === 'data/vacation-settings.json')
    if (settingsBlob) {
      console.log('\n=== STEP 5: Reading vacation-settings.json ===')
      const response = await fetch(settingsBlob.url, { cache: 'no-store' })
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Settings:', JSON.stringify(data, null, 2))
      } else {
        const text = await response.text()
        console.log('ERROR reading settings:', text)
      }
    }
    
    // List receipt images
    console.log('\n=== STEP 6: Listing receipt images ===')
    const { blobs: imageBlobs } = await list({ prefix: 'receipts/' })
    console.log('Found', imageBlobs.length, 'receipt images')
    for (const img of imageBlobs) {
      console.log(`  - ${img.pathname} (${img.size} bytes) URL: ${img.url}`)
    }
    
    console.log('\n=== DONE ===')
  } catch (error) {
    console.error('ERROR:', error)
  }
}

readAllData()
