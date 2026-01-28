function cal(feePerKBP2sh, feePerKB) {
  const p2shTransactionSize = 894; // Keep the hardcoded value
  const p2shSatoshis = feePerKBP2sh * 1000 * 280 + 100000;
  console.log(feePerKBP2sh * 280);
  const amountToSend =
    p2shSatoshis * 23 + p2shTransactionSize * ((feePerKB * 1000000) / 1000);
  console.log(amountToSend, (amountToSend * 23) / 100000000);
}

function gas(feePerKBP2sh) {
  console.log((feePerKBP2sh * 1000 * 280) / 100000000);
}

cal(9, 9);
gas(9);
