// Script: Sterge toate referintele la Vercel Blob din baza de date
// Pozele din Blob nu mai sunt accesibile (store suspendat) deci le stergem din DB
// Datele bonurilor (magazin, suma, data) raman intacte

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function cleanupBlobUrls() {
  console.log('=== Curatare URL-uri Vercel Blob din baza de date ===\n')

  // 1. Find all receipts with blob URLs
  const receiptsWithBlob = await sql`
    SELECT id, user_name, store_name, amount, date, image_urls
    FROM receipts
    WHERE image_urls IS NOT NULL
    AND array_length(image_urls, 1) > 0
    AND image_urls::text LIKE '%blob.vercel-storage%'
  `

  console.log(`Bonuri cu URL-uri Blob: ${receiptsWithBlob.length}`)

  for (const r of receiptsWithBlob) {
    console.log(`  - ${r.user_name} | ${r.store_name} | ${r.amount} RON | ${r.date}`)
  }

  if (receiptsWithBlob.length > 0) {
    // Clear all blob URLs from receipts
    const result = await sql`
      UPDATE receipts 
      SET image_urls = '{}'
      WHERE image_urls IS NOT NULL 
      AND image_urls::text LIKE '%blob.vercel-storage%'
    `
    console.log(`\nCuratate: ${receiptsWithBlob.length} bonuri - URL-uri Blob sterse din DB`)
  }

  // 2. Check vacations with blob URLs  
  const vacationsWithBlob = await sql`
    SELECT id, user_name, type, start_date, image_url
    FROM vacations
    WHERE image_url IS NOT NULL
    AND image_url != ''
    AND image_url LIKE '%blob.vercel-storage%'
  `

  console.log(`\nConcedii cu URL-uri Blob: ${vacationsWithBlob.length}`)

  for (const v of vacationsWithBlob) {
    console.log(`  - ${v.user_name} | ${v.type} | ${v.start_date}`)
  }

  if (vacationsWithBlob.length > 0) {
    await sql`
      UPDATE vacations 
      SET image_url = ''
      WHERE image_url IS NOT NULL 
      AND image_url LIKE '%blob.vercel-storage%'
    `
    console.log(`Curatate: ${vacationsWithBlob.length} concedii - URL-uri Blob sterse din DB`)
  }

  // 3. Summary
  const totalReceipts = await sql`SELECT COUNT(*) as cnt FROM receipts`
  const receiptsWithImages = await sql`
    SELECT COUNT(*) as cnt FROM receipts 
    WHERE image_urls IS NOT NULL 
    AND array_length(image_urls, 1) > 0 
    AND image_urls != '{}'
  `

  console.log('\n=== Sumar ===')
  console.log(`Total bonuri: ${totalReceipts[0].cnt}`)
  console.log(`Bonuri cu poze ramase (Cloudinary): ${receiptsWithImages[0].cnt}`)
  console.log(`Bonuri fara poze: ${Number(totalReceipts[0].cnt) - Number(receiptsWithImages[0].cnt)}`)
  console.log('\nBlob nu mai e folosit. Toate uploadurile noi merg pe Cloudinary.')
  console.log('Poti sterge Blob store-ul din Vercel Dashboard > Storage.')
}

cleanupBlobUrls().catch(console.error)
