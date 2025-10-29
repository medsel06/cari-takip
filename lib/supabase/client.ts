import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern for better performance
let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Supabase bilgileri yoksa hata verme
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (url === 'https://placeholder.supabase.co' && process.env.NODE_ENV === 'development') {
    console.warn('Supabase URL not configured. Please set NEXT_PUBLIC_SUPABASE_URL in .env.local')
  }

  // Create new instance with optimized settings
  supabaseInstance = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'katip-web'
      }
    }
  })

  return supabaseInstance
}

/**
 * Query helper with automatic error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
  try {
    const { data, error } = await queryFn()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Query error:', error)
      }
      throw error
    }

    return data
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Query execution error:', err)
    }
    throw err
  }
}