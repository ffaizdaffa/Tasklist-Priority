import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    '[CEO Talk] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set. ' +
      'Copy .env.example ke .env dan isi kredensial Supabase lo.'
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
