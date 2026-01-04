
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imfszwsusegpgxjjfujp.supabase.co';
// Extracting the key provided in the prompt (carefully avoiding the repeated prompt text)
const supabaseKey = 'sb_publishable_ydrXhS3e3H1iqGJtuIyCkQ_K5UfZjNY';

export const supabase = createClient(supabaseUrl, supabaseKey);
