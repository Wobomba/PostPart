import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etajqqnejfolsmslbsom.supabase.co';
const supabaseAnonKey = 'sb_publishable_cYiDAK6i1o8iwn5nOtHezw_5x0QwZzb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

