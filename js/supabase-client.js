const SUPABASE_URL = 'https://hnkwtzygwyelfjvutakm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS';

// Usamos window.supabase para acessar a biblioteca que veio do index.html
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);