/******************************************************
 * SUPABASE GLOBAL INIT (NO TIMING ISSUES)
 ******************************************************/

const supabaseUrl = "https://dccbsfoshbyhvmmcuasz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY2JzZm9zaGJ5aHZtbWN1YXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDM2NzAsImV4cCI6MjA5NjY3OTY3MH0.ZCqh6stpOrkHD7rWtU_97gow5NpnZxUsxKGQFDLXFmo";

if (!window.supabase || !window.supabase.createClient) {
    console.error("❌ Supabase SDK not loaded");
}

window.sb = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase ready immediately");