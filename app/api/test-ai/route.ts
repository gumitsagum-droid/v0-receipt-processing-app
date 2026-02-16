import { NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

const receiptSchema = z.object({
  amount: z.number().nullable(),
  storeName: z.string().nullable(),
  date: z.string().nullable(),
  receiptNumber: z.string().nullable(),
})

export async function GET() {
  try {
    // Test with a simple text prompt first
    const result = await generateText({
      model: 'openai/gpt-4o',
      prompt: 'Raspunde doar cu: "AI functioneaza corect"',
    })

    return NextResponse.json({ 
      success: true, 
      message: 'AI works!',
      response: result.text
    })
  } catch (error) {
    console.error('[v0] AI Test Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    }, { status: 500 })
  }
}
