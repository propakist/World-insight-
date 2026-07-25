// ============================================================
// World Insight — Supabase client (public/browser safe)
// Only the PUBLISHABLE key belongs here. Never put the secret
// key in any file that ships to the browser.
// ============================================================
const SUPABASE_URL = "https://stkqngzoxjjpjqzcbrga.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QJU7W5i8q5ax3hM8JXt9Rw_g7f7nhuk";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
