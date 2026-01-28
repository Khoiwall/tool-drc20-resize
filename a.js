const doge = require("bitcore-lib-doge");
const { PrivateKey } = doge;
function main() {
  console.log(doge.Networks);
  let privateKey = new PrivateKey(
    "QRrW5brvtjqiJhxb76YZqkb4RogFLptQqoe7RQ2fZEbY31uCuKA5"
  );
  let publicKey = privateKey.toPublicKey();
  console.log(publicKey.toString());
  console.log(
    Buffer.from(
      "0282ca04508ee48bb86f0861853ad99b93b9440c06c1005506914f167c38e5fb9f",
      "hex"
    )
  );
}
main();
