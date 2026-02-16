import { list } from '@vercel/blob'

async function debug() {
  const { blobs } = await list({ prefix: 'data/' })
  const receiptsBlob = blobs.find(b => b.pathname === 'data/receipts.json')
  const resp = await fetch(receiptsBlob.downloadUrl, { cache: 'no-store' })
  const data = await resp.json()
  
  // Print first 3 receipts with ALL fields
  for (let i = 0; i < Math.min(3, data.receipts.length); i++) {
    console.log('\n=== RECEIPT', i+1, '===')
    console.log(JSON.stringify(data.receipts[i], null, 2))
  }
  
  // Also print all field names from first receipt
  console.log('\n=== ALL FIELD NAMES ===')
  console.log(Object.keys(data.receipts[0]))
  
  // Print vacation settings and vacations too
  const vacBlob = blobs.find(b => b.pathname === 'data/vacations.json')
  if (vacBlob) {
    const vResp = await fetch(vacBlob.downloadUrl, { cache: 'no-store' })
    const vData = await vResp.json()
    console.log('\n=== VACATIONS DATA ===')
    console.log(JSON.stringify(vData, null, 2))
  }
  
  const settingsBlob = blobs.find(b => b.pathname === 'data/vacation-settings.json')
  if (settingsBlob) {
    const sResp = await fetch(settingsBlob.downloadUrl, { cache: 'no-store' })
    const sData = await sResp.json()
    console.log('\n=== VACATION SETTINGS ===')
    console.log(JSON.stringify(sData, null, 2))
  }
}

debug()
