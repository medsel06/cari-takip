import { NextResponse } from 'next/server';

// Basit bir test endpoint
export async function POST() {
  return NextResponse.json({ message: "API route çalışıyor" });
}
