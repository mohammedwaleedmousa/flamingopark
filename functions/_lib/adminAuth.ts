type Env = {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

const getSupabaseConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url || !key) throw