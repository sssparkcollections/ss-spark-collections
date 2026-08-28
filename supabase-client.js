import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qyocplqqedwvwljswzux.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KVwxzM9hhUsvF7iHsLD7OQ_YQnrLZwZ";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);