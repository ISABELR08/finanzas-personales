// Las dos variables son públicas por diseño (llevan el prefijo NEXT_PUBLIC_):
// la llave "publishable/anon" solo identifica al proyecto. Lo que protege los
// datos es la seguridad por fila (RLS) definida en supabase/migrations.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
