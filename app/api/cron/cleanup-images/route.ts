import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Sterge pozele din Cloudinary pentru bonuri din lunile anterioare
// Pozele din luna curenta raman vizibile
// Datele din DB (magazin, suma, data, etc.) NU se sterg - doar pozele
// Decontul poate fi descarcat oricand, chiar si fara poze
export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user || (user.role !== 'admin' && user.accessLevel < 2)) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Calculeaza prima zi a lunii curente
    // Bonurile create INAINTE de aceasta data vor avea pozele sterse
    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const cutoffDate = firstDayOfCurrentMonth.toISOString()

    // Gaseste bonuri cu poze din lunile anterioare
    const receipts = await sql`
      SELECT id, image_urls 
      FROM receipts 
      WHERE created_at < ${cutoffDate}
      AND image_urls IS NOT NULL 
      AND array_length(image_urls, 1) > 0
      AND image_urls != '{}'
    `

    let cleared = 0
    let deletedImages = 0
    const errors: string[] = []

    for (const row of receipts) {
      const imageUrls = row.image_urls as string[]
      
      for (const url of imageUrls) {
        // Sterge din Cloudinary
        if (url && url.includes('cloudinary')) {
          try {
            const parts = url.split('/upload/')
            if (parts[1]) {
              const afterUpload = parts[1]
              const publicId = afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '')
              await cloudinary.uploader.destroy(publicId)
              deletedImages++
            }
          } catch (err) {
            errors.push(`Receipt ${row.id}: ${err}`)
          }
        }
        // Blob URLs vechi - doar curata din DB
        if (url && url.includes('blob.vercel-storage')) {
          deletedImages++
        }
      }
      
      // Goleste image_urls in DB dar pastreaza toate celelalte date
      await sql`UPDATE receipts SET image_urls = '{}' WHERE id = ${row.id as string}`
      cleared++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Curatare completa: ${cleared} bonuri procesate, ${deletedImages} poze sterse. Pozele din luna curenta (${now.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}) au fost pastrate.`,
      cleared, 
      deletedImages,
      cutoffDate,
      errors: errors.length > 0 ? errors : undefined 
    })
  } catch (error) {
    console.error('[v0] Cleanup error:', error)
    return NextResponse.json({ error: 'Eroare la curatare' }, { status: 500 })
  }
}

// GET - poate fi apelat de Vercel Cron automat pe 1 a lunii
export async function GET(request: Request) {
  // Verifica CRON_SECRET pentru apeluri automate
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Daca nu e cron, incearca sesiunea normala
    const user = await getSession()
    if (!user || (user.role !== 'admin' && user.accessLevel < 2)) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
  }

  const now = new Date()
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const cutoffDate = firstDayOfCurrentMonth.toISOString()

  const receipts = await sql`
    SELECT id, image_urls 
    FROM receipts 
    WHERE created_at < ${cutoffDate}
    AND image_urls IS NOT NULL 
    AND array_length(image_urls, 1) > 0
    AND image_urls != '{}'
  `

  let cleared = 0
  let deletedImages = 0

  for (const row of receipts) {
    const imageUrls = row.image_urls as string[]
    
    for (const url of imageUrls) {
      if (url && url.includes('cloudinary')) {
        try {
          const parts = url.split('/upload/')
          if (parts[1]) {
            const afterUpload = parts[1]
            const publicId = afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '')
            await cloudinary.uploader.destroy(publicId)
            deletedImages++
          }
        } catch {
          // skip errors in cron
        }
      }
    }
    
    await sql`UPDATE receipts SET image_urls = '{}' WHERE id = ${row.id as string}`
    cleared++
  }

  return NextResponse.json({ 
    success: true, 
    cleared, 
    deletedImages,
    month: now.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })
  })
}
