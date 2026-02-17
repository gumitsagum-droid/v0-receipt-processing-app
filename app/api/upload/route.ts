import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createReceipt } from '@/lib/receipts'
import { getCardFirma } from '@/lib/card-mapping'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ExtractedData {
  amount: number | null
  storeName: string | null
  date: string | null
  receiptNumber: string | null
}

async function extractReceiptData(imageUrl: string): Promise<{ data: ExtractedData | null; error: string | null }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: `Analizeaza acest bon fiscal sau factura din Romania si extrage urmatoarele informatii in format JSON:
{
  "amount": <suma totala ca numar, fara RON/LEI, sau null daca nu gasesti>,
  "storeName": "<numele magazinului/firmei sau null>",
  "date": "<data in format DD.MM.YYYY sau null>",
  "receiptNumber": "<numarul bonului/facturii sau null>"
}

Raspunde DOAR cu JSON-ul, fara alte explicatii.`,
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { data: null, error: 'No response from AI' }
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { data: null, error: 'Could not parse AI response' }
    }

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedData
    return { data: parsed, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI error'
    console.error('[v0] AI extraction error:', errorMessage)
    return { data: null, error: errorMessage }
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Fisierul lipseste' }, { status: 400 })
    }

    // Check file size (max 4MB after compression)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fisierul este prea mare. Maxim 4MB.' }, { status: 400 })
    }

    // Upload image to Blob first
    let blob
    try {
      blob = await put(`receipts/${user.id}/${Date.now()}-${file.name}`, file, {
        access: 'public',
      })
    } catch (blobError) {
      console.error('[v0] Blob upload error:', blobError)
      return NextResponse.json({ error: 'Eroare la incarcarea imaginii' }, { status: 500 })
    }

    // Extract data from receipt using AI
    const { data: extractedData, error: aiError } = await extractReceiptData(blob.url)

    // Create receipt record with extracted data (or defaults if extraction failed)
    let receipt
    try {
      receipt = await createReceipt({
        userId: user.id,
        userName: user.name,
        amount: extractedData?.amount ?? 0,
        storeName: extractedData?.storeName ?? 'Necunoscut',
        date: extractedData?.date ?? new Date().toLocaleDateString('ro-RO'),
        receiptNumber: extractedData?.receiptNumber ?? 'N/A',
        imageUrl: blob.url,
        cardFirma: getCardFirma(user.name),
      })
    } catch (receiptError) {
      console.error('[v0] Receipt creation error:', receiptError)
      return NextResponse.json({ error: 'Eroare la salvarea bonului' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      receipt,
      aiExtracted: !!extractedData,
      aiError: aiError
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscuta'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
