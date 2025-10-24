import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Supabase bilgileri yoksa hata verme
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  if (url === 'https://placeholder.supabase.co') {
    console.warn('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL in .env.local')
  }
  
  return createBrowserClient(url, key)
}