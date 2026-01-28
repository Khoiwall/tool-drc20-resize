const axios = require("axios");

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmY2x5emFkYWl2amx3aHhjbmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTIwMzY4MiwiZXhwIjoyMDQ2Nzc5NjgyfQ.mhHLf9b0APfemC28egGi9bae5RAQ69LntZrnT5eBPe4";

async function updateAllow(value) {
  while (true) {
    try {
      await axios.patch(
        "https://xfclyzadaivjlwhxcncj.supabase.co/rest/v1/fee_mint?id=eq.1",
        { allow: value },
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      break;
    } catch (err) {}
  }
}

async function updateMintDone(value) {
  while (true) {
    try {
      await axios.patch(
        "https://xfclyzadaivjlwhxcncj.supabase.co/rest/v1/fee_mint?id=eq.1",
        { is_mint_done: value },
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      break;
    } catch (err) {}
  }
}

module.exports = { updateAllow, updateMintDone };
