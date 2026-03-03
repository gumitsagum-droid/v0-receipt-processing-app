import { list, del } from '@vercel/blob'

async function deleteAllBlobFiles() {
  console.log('=== Stergere toate fisierele din Vercel Blob ===\n')
  
  let totalDeleted = 0
  let cursor: string | undefined = undefined
  
  try {
    // List and delete in batches
    do {
      const response = await list({ cursor, limit: 100 })
      
      if (response.blobs.length === 0) {
        console.log('Nu mai sunt fisiere de sters.')
        break
      }
      
      console.log(`Gasit ${response.blobs.length} fisiere in batch...`)
      
      for (const blob of response.blobs) {
        try {
          await del(blob.url)
          totalDeleted++
          console.log(`  Sters: ${blob.pathname} (${(blob.size / 1024).toFixed(1)} KB)`)
        } catch (err) {
          console.log(`  EROARE la stergere ${blob.pathname}: ${err}`)
        }
      }
      
      cursor = response.hasMore ? response.cursor : undefined
    } while (cursor)
    
    console.log(`\n=== TOTAL: ${totalDeleted} fisiere sterse din Blob ===`)
    console.log('Blob-ul ar trebui sa fie acum gol sau aproape gol.')
    console.log('Spatiul se va elibera in cateva minute.')
    
  } catch (err) {
    console.log('EROARE:', err)
    console.log('\nDaca Blob-ul e suspendat, trebuie sa-l stergi manual:')
    console.log('1. Mergi la: https://vercel.com')
    console.log('2. Click pe proiectul "v0-receipt-processing-app"')
    console.log('3. Tab "Storage" din meniul de sus')
    console.log('4. Click pe Blob store > sterge fisierele sau store-ul')
  }
}

deleteAllBlobFiles()
