import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createReceipt } from '@/lib/receipts';
import { getCardFirma } from '@/lib/card-mapping';
import OpenAI from 'openai';
import { sql } from "@vercel/postgres";

async function uploadToCloudinary(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

  const response = await fetch(
         `https://api.cloudinary.com${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,

      method: "POST", 
      body: formData 
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Cloudinary upload failed');
  }

  const data = await response.json();
  return data.secure_url; 
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Niciun fișier încărcat' }, { status: 400 });
    }

    // 1. Încărcăm în Cloudinary (Gratis, ocolește limita Vercel Blob)
    const imageUrl = await uploadToCloudinary(file);

    // 2. Salvăm URL-ul în Neon Postgres (Ultrafilterneon)
    // Asigură-te că tabelul 'receipts' există în baza de date
    await sql`
      INSERT INTO receipts (url, name, created_at)
      VALUES (${imageUrl}, ${file.name}, NOW())
    `;

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.error('Eroare la upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

