export const environment = {
  production: false,
  supabaseUrl: process.env['SUPABASE_URL'] || 'https://xyzcompany.supabase.co',
  supabaseKey: process.env['SUPABASE_KEY'] || 'public-anon-key'
};
