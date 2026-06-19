/******************************************************
 * SUPABASE CLIENT (GLOBAL SHARED)
 ******************************************************/

const SUPABASE_URL = "https://dccbsfoshbyhvmmcuasz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY2JzZm9zaGJ5aHZtbWN1YXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDM2NzAsImV4cCI6MjA5NjY3OTY3MH0.ZCqh6stpOrkHD7rWtU_97gow5NpnZxUsxKGQFDLXFmo";

// Create single shared client
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("✅ Supabase client initialized");