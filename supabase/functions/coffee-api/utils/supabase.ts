// utils/supabase.ts
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.ts'

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
