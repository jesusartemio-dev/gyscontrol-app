import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo PDF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdfParse(buffer);

    return NextResponse.json({ text: pdfData.text });
  } catch (error) {
    console.error('❌ Error al procesar PDF:', error);
    return NextResponse.json({ error: 'Error al procesar PDF' }, { status: 500 });
  }
}
