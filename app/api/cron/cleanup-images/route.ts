import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Sterge pozele din Cloudinary pentru bonuri mai vechi de 30 zile
// Pastreaza datele din DB (magazin, suma, data, etc.) - doar pozele se sterg
// Poate fi apelat manual de admin sau programat ca Vercel Cron
export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user || (user.role !== 'admin' && user.accessLevel < 2)) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const olderThanDays = body.days || 30

    // Find receipts with images older than X days
    const receipts = await sql`
      SELECT id, image_urls 
      FROM receipts 
      WHERE created_at < NOW() - make_interval(days => ${olderThanDays})
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
        if (url && url.includes('cloudinary')) {
          try {
            const parts = url.split('/upload/')
            if (parts[1]) {
              // Remove version prefix (v1234567890/) and extension
              const afterUpload = parts[1]
              const publicId = afterUpload.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '')
              await cloudinary.uploader.destroy(publicId)
              deletedImages++
            }
          } catch (err) {
            errors.push(`Receipt ${row.id}: ${err}`)
          }
        }
      }
      
      // Clear image_urls in DB but keep all other receipt data
      await sql`UPDATE receipts SET image_urls = '{}' WHERE id = ${row.id as string}`
      cleared++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Curatare completa: ${cleared} bonuri procesate, ${deletedImages} poze sterse`,
      cleared, 
      deletedImages,
      errors: errors.length > 0 ? errors : undefined 
    })
  } catch (error) {
    console.error('[v0] Cleanup error:', error)
    return NextResponse.json({ error: 'Eroare la curatare' }, { status: 500 })
  }
}
