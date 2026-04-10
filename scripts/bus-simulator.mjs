import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const jitter = (value, scale = 0.0007) => value + (Math.random() - 0.5) * scale;

async function tick() {
  const { data: buses, error } = await supabase.from("buses").select("id, lat, lng");
  if (error) {
    console.error("Fetch error", error.message);
    return;
  }

  if (!buses?.length) {
    console.log("No buses found, skipping");
    return;
  }

  const updates = buses.map((bus) => ({
    id: bus.id,
    lat: jitter(bus.lat),
    lng: jitter(bus.lng),
    updated_at: new Date().toISOString(),
  }));

  const { error: updateError } = await supabase.from("buses").upsert(updates, { onConflict: "id" });
  if (updateError) {
    console.error("Update error", updateError.message);
    return;
  }

  console.log(`[${new Date().toISOString()}] Updated ${updates.length} bus records`);
}

console.log("Starting EDVIX bus simulator. Press Ctrl+C to stop.");
await tick();
setInterval(tick, 8000);
