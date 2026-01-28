const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmY2x5emFkYWl2amx3aHhjbmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTIwMzY4MiwiZXhwIjoyMDQ2Nzc5NjgyfQ.mhHLf9b0APfemC28egGi9bae5RAQ69LntZrnT5eBPe4";

async function getFeeMint() {
  try {
    const response = await axios.get(
      "https://xfclyzadaivjlwhxcncj.supabase.co/rest/v1/fee_mint?id=eq.1",
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    return response.data[0];
    // 5650
  } catch (err) {
    console.log(err);
    await getFeeMint();
  }
}

module.exports = { getFeeMint };
