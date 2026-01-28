const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

const supabaseKey = ""

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
