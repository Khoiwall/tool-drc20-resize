const dogecore = require("bitcore-lib-doge");
const axios = require("axios");
const { PrivateKey, Address, Transaction, Script, Opcode, PublicKey } =
  dogecore;
const { script } = require("belcoinjs-lib");
const buffer = require("bitcore-lib-doge/lib/util/buffer");

async function main() {
  // console.log(
  //   new Script(
  //     "473044022045414970e1bda2d398ccf465276e603a21a8f1654e3eb557aeb20fba7859cf5602205027a3413674c5eac844f7383bba06d9423eb452bdaea6677fe5328322b44276012103563c484d23b2662435bb898914aa59d21c8475e6baaad8f14187761d23bbfca7"
  //   )
  // );
  // console.log(new Script("a9149b402803555511d15d81207d3e2cb3e6bc365e0e87"));
  // console.log(new Script("03a0ea8b6d6d6d51"));
  // a914474451baf3ee4e6bb02b387735708da2a2cd0e4e87
  // console.log(
  //   new Script(
  //     "036f7264510a746578742f706c61696e00347b2270223a226472632d3230222c226f70223a226d696e74222c227469636b223a22646f6778222c22616d74223a22393939227d080088757575757551"
  //   )
  // );
  // console.log(
  //   new Script(
  //     "036f7264510a746578742f706c61696e00347b2270223a226472632d3230222c226f70223a226d696e74222c227469636b223a22646f6778222c22616d74223a22393939227d06757575757551"
  //   )
  // );
  let responseTx = await axios.get(
    `https://dogebook.nownodes.io/api/v2/tx/2e8e8ebfad4bf31cb891d488298a148e66cf5effc8d1874b86ec7d1642dfb37f
  `,
    {
      headers: {
        "api-key": "08e9ad80-b8ba-4da4-9d2f-a194cf25d6ca",
      },
      TIMEOUT: 50000,
    }
  );
  // 036f7264510a746578742f706c61696e00347b2270223a226472632d3230222c226f70223a226d696e74222c227469636b223a22646f6778222c22616d74223a22393939227d0b06257df5eb872d6d6d6d51
  //a914a5557a1152bcd5a59acc52da8037f082a87c8be987

  //a914c7c8ff9f1538cda25bddd8c648e5a2abc5f8d60b87
  //036f7264510a746578742f706c61696e00347b2270223a226472632d3230222c226f70223a226d696e74222c227469636b223a22646f6778222c22616d74223a22393939227d046d756d51

  console.log(responseTx.data);
  // console.clear();
}

// async function main() {
//   let responseTx = await axios.get(
//     `https://dogebook.nownodes.io/api/v2/tx/f069f8e50290d20dd25c2bbb0be6dd157c1771cc7607d9201f42e0d692c44aa0`,
//     {
//       headers: {
//         "api-key": "02b5662f-f997-497a-96a8-552ee717347f",
//       },
//       TIMEOUT: 50000,
//     }
//   );

//   let responseTxOut = await axios.get(
//     `https://dogebook.nownodes.io/api/v2/tx/ec2782c9fd104ad0c2711a2e69ee0fb9c199763f7d1b330dcc42b5e55b8ab23a`,
//     {
//       headers: {
//         "api-key": "02b5662f-f997-497a-96a8-552ee717347f",
//       },
//       TIMEOUT: 50000,
//     }
//   );
//   const txsBefore = new Transaction(responseTx?.data?.hex);
//   let tsx = [];
//   for (let i = 0; i < txsBefore.outputs.length; i++) {
//     let p2shInput = new Transaction.Input({
//       prevTxId:
//         "f069f8e50290d20dd25c2bbb0be6dd157c1771cc7607d9201f42e0d692c44aa0",
//       outputIndex: i,
//       output: txsBefore.outputs[i],
//       script: "",
//     });
//     console.log(p2shInput);
//     p2shInput.clearSignatures = () => {};
//     p2shInput.getSignatures = () => {};

//     let tx = new Transaction();

//     tx.addInput(p2shInput);
//     tx.to("DDcesfZsA7XNqxQ9jMVhzjHTbmMe7XY9iV", 100000);

//     tx.inputs[0].setScript(new Script(responseTxOut.data.vin[0].hex));
//     tsx.push(tx);
//   }
//   for (let i = 0; i < tsx.length; i++) {
//     console.log(tsx[0]);
//     await broadcast(tsx[i], false);
//   }
// }

// async function broadcast(tx, retry) {
//   const body = {
//     API_key: "02b5662f-f997-497a-96a8-552ee717347f",
//     jsonrpc: "2.0",
//     id: "test",
//     method: "sendrawtransaction",
//     params: [tx.toString()],
//   };

//   while (true) {
//     try {
//       await axios.post("https://doge.nownodes.io", body, {
//         TIMEOUT: 20000,
//       });
//       console.log(tx.hash);
//       break;
//     } catch (e) {
//       console.log(e?.response?.data);
//     }
//   }
// }

// main();

main();
