const { createClient } = supabase;

// If you want to override from HTML, set window.SUPABASE_URL / window.SUPABASE_KEY before this script.
const SUPABASE_URL = window.SUPABASE_URL || "https://jtqraahesthkgthbcktp.supabase.co";
const SUPABASE_KEY = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cXJhYWhlc3Roa2d0aGJja3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ5NzIsImV4cCI6MjA4Nzg1MDk3Mn0.HSburGL2Moy06hMqClJ1TDO5ix2-yLCd3aAC5QYmXYc";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase configuration missing: set SUPABASE_URL and SUPABASE_KEY');
}

window.sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});