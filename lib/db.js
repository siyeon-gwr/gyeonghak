// lib/db.js - Supabase 연동
import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getDb() {
  if (supabase) return supabase;
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  return supabase;
}
