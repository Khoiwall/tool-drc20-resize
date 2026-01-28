function cal(fee) {
  const p2shTransactionSize = 835; // Keep the hardcoded value
  const amountToSend = (167 * fee + 100000) * 23 + p2shTransactionSize * fee;
  console.log(amountToSend, (amountToSend * 140) / 100000000);
}

function gas(satoshis) {
  console.log((167 * satoshis) / 100000000);
}

cal(6200);
gas(6200);
// 2k mint 87.4 vi
// 1k mint 44 vi
// 1k5 mint 66 vi
// 1k6 mint 70 vi
// 1k2 mint 52 vi
// 1k3 mint 57 vi
// 2k5 mint 107 vi
// 500 mint 22 ví
// 3k mint 131 ví
// 3k5 mint 153 vi
// 3k2 mint 140 ví
