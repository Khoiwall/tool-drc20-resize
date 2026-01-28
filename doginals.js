#!/usr/bin/env node

const dogecore = require("bitcore-lib-doge");
const axios = require("axios");
const fs = require("fs");
const dotenv = require("dotenv");
const mime = require("mime-types");
const express = require("express");
const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore;
const { Hash, Signature } = dogecore.crypto;
const path = require("path");
const { getFeeMint } = require("./check-fee-mint");
const { updateAllow, updateMintDone } = require("./update");
const { p2shTmp } = require("./output");

dotenv.config();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.env.TESTNET == "true") {
  dogecore.Networks.defaultNetwork = dogecore.Networks.testnet;
}

if (process.env.FEE_PER_KB) {
  Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB);
} else {
  Transaction.FEE_PER_KB = 100000000;
}

const WALLET_DIR = path.join(__dirname, "wallet");
function WALLET_PATH(walletIndex) {
  return path.join(WALLET_DIR, `wallet_${walletIndex}.json`);
}

async function main() {
  let cmd = process.argv[2];

  if (fs.existsSync("pending-txs.json")) {
    console.log("found pending-txs.json. rebroadcasting...");
    const txs = JSON.parse(fs.readFileSync("pending-txs.json"));
    await broadcastAll(
      txs.map((tx) => new Transaction(tx)),
      false
    );
    return;
  }

  if (cmd == "mint") {
    await mint();
  } else if (cmd == "wallet") {
    await wallet();
  } else if (cmd == "server") {
    await server();
  } else if (cmd == "drc-20") {
    await doge20();
  } else if (cmd == "auto") {
    await dogeAuto();
  } else if (cmd == "tap") {
    await doge20Tap();
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

async function doge20() {
  let subcmd = process.argv[3];

  if (subcmd === "mint") {
    await doge20Transfer("mint");
  } else if (subcmd === "transfer") {
    await doge20Transfer();
  } else if (subcmd === "deploy") {
    await doge20Deploy();
  } else {
    throw new Error(`unknown subcommand: ${subcmd}`);
  }
}

async function dogeAuto() {
  let subcmd = process.argv[3];

  if (subcmd === "drc-20") {
    await auto("drc-20");
  } else if (subcmd === "tap") {
    await auto("tap");
  } else {
    throw new Error(`unknown subcommand: ${subcmd}`);
  }
}

async function doge20Deploy() {
  const argAddress = process.argv[4];
  const argTicker = process.argv[5];
  const argMax = process.argv[6];
  const argLimit = process.argv[7];

  const doge20Tx = {
    p: "drc-20",
    op: "deploy",
    tick: `${argTicker.toLowerCase()}`,
    max: `${argMax}`,
    lim: `${argLimit}`,
  };

  const parsedDoge20Tx = JSON.stringify(doge20Tx);

  // encode the doge20Tx as hex string
  const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString("hex");

  console.log("Deploying drc-20 token...");
  await mint(argAddress, "text/plain;charset=utf-8", encodedDoge20Tx);
}

async function wallet() {
  const subcmd = process.argv[3];
  const walletIndex = process.argv[4];

  // Define a default number of wallets or handle it dynamically
  const numWallets = process.env.WALLETS * 1; // Replace with the actual number of wallets or obtain dynamically

  // Handle missing subcommand
  if (!subcmd) {
    throw new Error(
      "No subcommand provided. Please specify a subcommand (sync, new, balance, send, sendall, split)."
    );
  }

  // Handle invalid wallet index
  if (walletIndex !== undefined && isNaN(walletIndex)) {
    throw new Error("Invalid wallet index. Please provide a valid integer.");
  }

  // Switch statement for subcommands
  switch (subcmd) {
    case "sync":
      await walletSync(walletIndex, numWallets);
      break;
    case "new":
      await walletNew(numWallets);
      break;
    case "balance":
      walletBalance(walletIndex);
      break;
    case "send":
      await walletSend(walletIndex);
      break;
    case "sendall":
      await walletSendAll(numWallets);
      break;
    case "split":
      await walletSplit(walletIndex);
      break;
    default:
      throw new Error(`Unknown subcommand: ${subcmd}`);
  }
}

async function checkTx(tx) {
  // return true
  let i = 0;
  while (i < 10000) {
    try {
      const response = await axios.get(
        `https://wonky-ord.dogeord.io/tx/${tx}?json=true`
      );
      if (response.data.blockhash != null) {
        console.log("tx xác nhận");
        break;
      } else {
        console.log("tx chưa xác nhận");
      }
    } catch (err) {
      console.log("không tìm thấy tx or block");
    }
    await sleep(5000);
    i++;
  }
}

let walletSynced = 0;
let walletMinted = 0;

async function checkWalletSync() {
  const numWallets = process.env.WALLETS * 1;
  let i = 0;
  while (i < 10000) {
    if (numWallets - 1 == walletSynced) {
      console.log("Sync xong");
      break;
    } else {
      console.log("Sync được " + walletSynced);
    }
    await sleep(2000);
  }
}

async function checkMintedWallet() {
  while (true) {
    const objectMint = await getFeeMint();
    const { is_mint_done } = objectMint;
    if (is_mint_done) break;
    const numWallets = process.env.WALLETS * 1;
    if (walletMinted >= (numWallets - 1) * 23 + (numWallets - 1)) {
      await updateMintDone(true);
      console.log("mint xong");
      break;
    } else {
      console.clear();
    }
    await sleep(5000);
  }
}

async function auto(op) {
  let mint = 0;
  while (true) {
    const numWallets = process.env.WALLETS * 1;
    walletSynced = 0;
    walletMinted = 0;
    const objectMint = await getFeeMint();
    const { feeMint, allow, is_stop } = objectMint;
    if (is_stop) {
      console.log("Stop mint");
      break;
    } else if (allow == false) {
      console.log("chưa cho phép mint");
      await sleep(5000);
    } else if (feeMint != 0) {
      const fn = op == "drc-20" ? walletSendAll : walletSendAllTap;
      const tx = await fn(numWallets, feeMint);
      if (tx == undefined) {
        mint = -1;
        console.log("Chay lai");
      } else if (tx != "") {
        await updateAllow(false);
        await updateMintDone(false);
        await checkTx(tx);
        await walletSync(undefined, numWallets);
        await checkWalletSync();
        Transaction.FEE_PER_KB = feeMint * 1000;
        if (op == "drc-20") {
          await doge20Transfer("mint", feeMint);
        } else {
          await doge20Tap("tap", feeMint);
        }
        await checkMintedWallet();
      } else {
        console.log("hết tiền");
        break;
      }
    } else {
      console.log("Tool lỗi");
      break;
    }
    mint += 1;
    console.log("Mint tiếp");
  }
}

function loadWallet(walletIndex) {
  const walletPath = WALLET_PATH(walletIndex);
  return JSON.parse(fs.readFileSync(walletPath));
}

async function walletSendAll(numWallets, feeMint = 6200) {
  try {
    const wallets = await Promise.all(
      Array.from({ length: numWallets }, (_, i) => loadWallet(i))
    );
    const senderWallet = wallets[0];
    if (senderWallet.utxos.length === 0) {
      console.error("Wallet 0 has no funds to send.");
      return "";
    }

    const p2shTransactionSize = 835;
    const amountToSend =
      (167 * feeMint + 100000) * 23 + p2shTransactionSize * feeMint;
    const totalBalance = senderWallet.utxos.reduce((acc, curr) => {
      return acc + parseInt(curr.satoshis);
    }, 0);
    if (amountToSend * (numWallets - 1) > totalBalance) {
      const requiredBalance = amountToSend * (numWallets - 1);
      console.log(
        `Insufficient balance. Required: ${requiredBalance} Satoshis, Available: ${totalBalance} Satoshis.`
      );
      return "";
    }
    Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB_SENDALL);
    const tx = new Transaction().from(senderWallet.utxos);
    wallets.slice(1).forEach((_, index) => {
      const walletPath = WALLET_PATH(index + 1);
      const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
      tx.to(walletData.address, amountToSend);
    });

    tx.change(senderWallet.address).sign(senderWallet.privkey);
    await broadcast(tx, true, 0);

    console.log("Transaction broadcasted. TXID:", tx.hash);
    return tx.hash;
  } catch (error) {
    console.error("Error in walletSendAll:", error.message);
  }
}

async function walletSendAllTap(numWallets, feeMint) {
  try {
    const wallets = await Promise.all(
      Array.from({ length: numWallets }, (_, i) => loadWallet(i))
    );
    const senderWallet = wallets[0];
    if (senderWallet.utxos.length === 0) {
      console.error("Wallet 0 has no funds to send.");
      return "";
    }

    const p2shTransactionSize = 835; // Keep the hardcoded value
    const amountToSend =
      (175 * feeMint + 100000) * 23 + p2shTransactionSize * feeMint;
    const totalBalance = senderWallet.utxos.reduce((acc, curr) => {
      return acc + parseInt(curr.satoshis);
    }, 0);
    if (amountToSend * (numWallets - 1) > totalBalance) {
      const requiredBalance = amountToSend * (numWallets - 1);
      console.log(
        `Insufficient balance. Required: ${requiredBalance} Satoshis, Available: ${totalBalance} Satoshis.`
      );
      return "";
    }
    Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB_SENDALL);
    const tx = new Transaction().from(senderWallet.utxos);
    wallets.slice(1).forEach((_, index) => {
      const walletPath = WALLET_PATH(index + 1); // Adjust index to start from 1
      const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
      tx.to(walletData.address, amountToSend);
    });

    tx.change(senderWallet.address).sign(senderWallet.privkey);
    await broadcast(tx, true, 0);

    console.log("Transaction broadcasted. TXID:", tx.hash);
    return tx.hash;
  } catch (error) {
    console.error("Error in walletSendAll:", error.message);
  }
}

async function walletNew(numWallets) {
  const promises = Array.from({ length: numWallets }, (_, i) =>
    createWallet(i)
  );

  await Promise.all(promises);
}

async function createWallet(walletIndex) {
  try {
    const walletPath = path.join(WALLET_DIR, `wallet_${walletIndex}.json`);

    // Create the parent directory if it doesn't exist
    if (!fs.existsSync(WALLET_DIR)) {
      fs.mkdirSync(WALLET_DIR, { recursive: true });
    }

    if (!fs.existsSync(walletPath)) {
      const privateKey = new PrivateKey();
      const privkey = privateKey.toWIF();
      const address = privateKey.toAddress().toString();
      const json = { privkey, address, utxos: [] };

      // Write to the file
      await fs.promises.writeFile(walletPath, JSON.stringify(json, null, 2));
      console.log(`Wallet ${walletIndex + 1} created - address: ${address}`);
    } else {
      console.log(`Wallet ${walletIndex + 1} already exists`);
    }
  } catch (error) {
    console.error(`Error creating wallet ${walletIndex + 1}:`, error.message);
  }
}

async function walletSync(walletIndex, numWallets) {
  if (process.env.TESTNET === "true") {
    throw new Error("Testnet API is not available.");
  }

  if (walletIndex !== undefined && !isNaN(walletIndex)) {
    await syncSingleWallet(walletIndex);
  } else {
    for (let i = 1; i < numWallets; i++) {
      syncSingleWallet(i);
      await sleep(500);
    }
  }
}

async function syncSingleWallet(walletIndex) {
  const wallet = loadWallet(walletIndex);

  if (!wallet.address) {
    throw new Error(`Wallet ${walletIndex} address is missing.`);
  }

  console.log(
    `Syncing utxos for Wallet ${walletIndex} with dogechain.info API`
  );
  try {
    // let response = await axios.get(
    //   `https://wonky-ord.dogeord.io/utxos/balance/${wallet.address}?show_unsafe=false`
    //   //`https://wonky-ord.dogeord.io/utxos/balance/${wallet.address}`
    // );

    // wallet.utxos = response?.data?.utxos?.map((utxo) => ({
    //   txid: utxo.txid,
    //   vout: utxo.vout,
    //   script: utxo.script,
    //   satoshis: utxo.shibes,
    // }));

    let response = await axios.get(
      `https://dogebook.nownodes.io/api/v2/utxo/${wallet.address}`,
      {
        headers: {
          "api-key": "a0e59ffd-422e-48a7-a8fd-450f03e2450e",
        },
      }
    );
    const utxos = [];
    for (let i = 0; i < response?.data?.length; i++) {
      let responseTx = await axios.get(
        `https://dogebook.nownodes.io/api/v2/tx-specific/${response?.data[i]?.txid}`,
        {
          headers: {
            "api-key": "a0e59ffd-422e-48a7-a8fd-450f03e2450e",
          },
        }
      );
      const tx = responseTx?.data?.vout.filter(
        (tx) => tx.scriptPubKey.addresses[0] == wallet.address
      )[0];

      utxos.push({
        txid: response?.data?.[i]?.txid,
        vout: response?.data?.[i]?.vout,
        script: tx?.scriptPubKey?.hex,
        satoshis: response?.data?.[i]?.value * 1,
      });
    }

    wallet.utxos = utxos;

    fs.writeFileSync(WALLET_PATH(walletIndex), JSON.stringify(wallet, null, 2));

    const balance = wallet.utxos.reduce(
      (acc, curr) => acc + parseInt(curr.satoshis),
      0
    );
    if (balance == 0 && walletIndex != 0) {
      console.log(`Resync: balance 0`);
      await sleep(1500);
      await syncSingleWallet(walletIndex);
    } else {
      walletSynced++;
      console.log(`Balance for Wallet ${walletIndex}: ${balance}`);
    }
  } catch (error) {
    console.error(
      `Error syncing utxos for Wallet ${walletIndex}:`,
      error.message
    );
    await syncSingleWallet(walletIndex);
  }
}

function walletBalance() {
  let wallet = JSON.parse(fs.readFileSync(WALLET_PATH));

  let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);

  console.log(wallet.address, balance);
}

async function walletSend() {
  const argAddress = process.argv[4];
  const argAmount = process.argv[5];

  let wallet = JSON.parse(fs.readFileSync(WALLET_PATH));

  let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);
  if (balance == 0) throw new Error("no funds to send");

  let receiver = new Address(argAddress);
  let amount = parseInt(argAmount);

  let tx = new Transaction();
  if (amount) {
    tx.to(receiver, amount);
    fund(wallet, tx);
  } else {
    tx.from(wallet.utxos);
    tx.change(receiver);
    tx.sign(wallet.privkey);
  }

  await broadcast(tx, true);

  console.log(tx.hash);
}

async function walletSplit() {
  let splits = parseInt(process.argv[4]);

  let wallet = JSON.parse(fs.readFileSync(WALLET_PATH));

  let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);
  if (balance == 0) throw new Error("no funds to split");

  let tx = new Transaction();
  tx.from(wallet.utxos);
  for (let i = 0; i < splits - 1; i++) {
    tx.to(wallet.address, Math.floor(balance / splits));
  }
  tx.change(wallet.address);
  tx.sign(wallet.privkey);

  await broadcast(tx, true);

  console.log(tx.hash);
}

async function doge20Transfer(op = "transfer", feeMint = 6200) {
  const argAddress = process.argv[4];
  const argTicker = process.argv[5];
  const argAmount = process.argv[6];
  const doge20Tx = {
    p: "drc-20",
    op,
    tick: `${argTicker.toLowerCase()}`,
    amt: `${argAmount}`,
  };
  console.log(doge20Tx);
  // console.log(doge20Tx);
  const parsedDoge20Tx = JSON.stringify(doge20Tx);

  // encode the doge20Tx as hex string
  const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString("hex");

  for (let i = 1; i < process.env.WALLETS * 1; i++) {
    try {
      const walletPath = WALLET_PATH(i);
      const wallet = JSON.parse(fs.readFileSync(walletPath));
      const balance = wallet.utxos.reduce(
        (acc, curr) => acc + parseInt(curr.satoshis),
        0
      );
      if (balance > 0) {
        mint(argAddress, "text/plain", encodedDoge20Tx, i, feeMint);
      }
    } catch (error) {
      console.error(`Error minting from Wallet ${i}:`, error.message);
    }
  }
}

async function doge20Tap() {
  const argAddress = process.argv[4];
  const argTicker = process.argv[5];
  const argAmount = process.argv[6];

  const doge20Tx = {
    p: "tap",
    op: "token-mint",
    tick: argTicker,
    amt: argAmount,
  };
  console.log(doge20Tx);
  // console.log(doge20Tx);
  const parsedDoge20Tx = JSON.stringify(doge20Tx);

  // encode the doge20Tx as hex string
  const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString("hex");

  for (let i = 1; i < process.env.WALLETS * 1; i++) {
    try {
      mint(argAddress, "text/plain", encodedDoge20Tx, i, false, feeMint);
      // console.log(`Minting from Wallet ${i} successful.`);
    } catch (error) {
      console.error(`Error minting from Wallet ${i}:`, error.message);
    }
  }
}

const MAX_SCRIPT_ELEMENT_SIZE = 520;

async function mint(
  paramAddress,
  paramContentTypeOrFilename,
  paramHexData,
  walletIndex,
  feeMint = 6200
) {
  const argAddress = paramAddress || process.argv[3];
  const argContentTypeOrFilename =
    paramContentTypeOrFilename || process.argv[4];
  const argHexData = paramHexData || process.argv[5];

  const address = new Address(argAddress);
  let contentType;
  let data;

  try {
    if (fs.existsSync(argContentTypeOrFilename)) {
      contentType = mime.contentType(mime.lookup(argContentTypeOrFilename));
      data = fs.readFileSync(argContentTypeOrFilename);
    } else {
      contentType = argContentTypeOrFilename;
      if (!/^[a-fA-F0-9]*$/.test(argHexData)) {
        throw new Error("Data must be in hex format.");
      }
      console.log(argHexData);
      data = Buffer.from(argHexData, "hex");
    }

    if (data.length === 0) {
      throw new Error("No data to mint.");
    }

    if (contentType.length > MAX_SCRIPT_ELEMENT_SIZE) {
      throw new Error("Content type is too long.");
    }

    const walletPath = WALLET_PATH(walletIndex); // Corrected usage of WALLET_PATH
    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet file not found at ${walletPath}.`);
    }

    const wallet = JSON.parse(fs.readFileSync(walletPath));
    const txs = inscribe(wallet, address, contentType, data, feeMint);
    await broadcastAll(txs, false, walletIndex);
  } catch (error) {
    console.error("Error in mint:", error.message);
    throw error;
  }
}

async function broadcastTmp(tx, retry, walletIndex) {
  while (true) {
    try {
      await broadcast(tx, retry, walletIndex);
      console.log("Tx success: ", tx.hash);
      walletMinted++;
      break;
    } catch (err) {
      let msg = err?.response?.data?.error?.message;
      console.log(msg);
      if (msg?.includes("transaction already in block chain")) {
        walletMinted++;
        break;
      }
      if (msg?.includes("bad-txns-inputs-spent")) {
        walletMinted++;
        break;
      }
    }
    await sleep(100);
  }
}

async function broadcastAll(txs, retry, walletIndex) {
  for (let index = 0; index < txs.length; index++) {
    const tx = txs[index];
    broadcastTmp(tx, retry, walletIndex);
  }
}

function bufferToChunk(b, type) {
  b = Buffer.from(b, type);
  return {
    buf: b.length ? b : undefined,
    len: b.length,
    opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77,
  };
}

function numberToChunk(n) {
  return {
    buf:
      n <= 16
        ? undefined
        : n < 128
        ? Buffer.from([n])
        : Buffer.from([n % 256, n / 256]),
    len: n <= 16 ? 0 : n < 128 ? 1 : 2,
    opcodenum: n == 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2,
  };
}

function opcodeToChunk(op) {
  return { opcodenum: op };
}

const MAX_CHUNK_LEN = 240;
const MAX_PAYLOAD_LEN = 1500;

function inscribe(wallet, address, contentType, data, feeMint = 6200) {
  let txs = [];

  let parts = [];
  while (data.length) {
    let part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length));
    data = data.slice(part.length);
    parts.push(part);
  }

  let inscription = new Script();
  inscription.chunks.push(bufferToChunk("ord"));
  inscription.chunks.push(numberToChunk(parts.length));
  inscription.chunks.push(bufferToChunk(contentType));
  parts.forEach((part, n) => {
    inscription.chunks.push(numberToChunk(parts.length - n - 1));
    inscription.chunks.push(bufferToChunk(part));
  });

  let lastPartial;
  let p2shtx;
  let arrsLock = [];

  while (inscription.chunks.length) {
    let partial = new Script();

    if (txs.length === 0) {
      partial.chunks.push(inscription.chunks.shift());
    }

    while (
      partial.toBuffer().length <= MAX_PAYLOAD_LEN &&
      inscription.chunks.length
    ) {
      partial.chunks.push(inscription.chunks.shift());
      partial.chunks.push(inscription.chunks.shift());
    }

    if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
      inscription.chunks.unshift(partial.chunks.pop());
      inscription.chunks.unshift(partial.chunks.pop());
    }
    for (let i = 0; i < 23; i++) {
      let lock = new Script();
      const number1 = Math.floor(Math.random() * (254 - 2)) + 3;
      const number2 = Math.floor(Math.random() * (254 - 2)) + 3;
      const number3 = Math.floor(Math.random() * (254 - 2)) + 3;
      lock.chunks.push(opcodeToChunk(3));
      lock.chunks.push(opcodeToChunk(number1));
      lock.chunks.push(opcodeToChunk(number2));
      lock.chunks.push(opcodeToChunk(number3));
      for (let i = 0; i < 3; i++) {
        lock.chunks.push(opcodeToChunk(Opcode.OP_2DROP));
      }
      lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE));

      let lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()));
      let p2sh = new Script();
      p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160));
      p2sh.chunks.push(bufferToChunk(lockhash));
      p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL));
      arrsLock.push({ p2sh, lock });
    }

    const transactionSize = 167;
    const p2shSatoshis = feeMint * transactionSize + 100000;
    p2shtx = new Transaction();
    for (let i = 0; i < 23; i++) {
      let p2shOutput = new Transaction.Output({
        script: arrsLock[i].p2sh,
        satoshis: p2shSatoshis,
      });
      p2shtx.addOutput(p2shOutput);
    }
    fund(wallet, p2shtx);
    txs.push(p2shtx);
    lastPartial = partial;
  }
  for (
    let outputIndex = 0;
    outputIndex < p2shtx.outputs.length;
    outputIndex++
  ) {
    let p2shInput = new Transaction.Input({
      prevTxId: p2shtx.hash,
      outputIndex: outputIndex,
      output: p2shtx.outputs[outputIndex],
      script: "",
    });
    p2shInput.clearSignatures = () => {};
    p2shInput.getSignatures = () => {};
    let tx = new Transaction();
    tx.addInput(p2shInput);

    tx.to(address, 100000);
    fund(wallet, tx);

    let unlock = new Script();
    unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
    unlock.chunks.push(bufferToChunk(arrsLock[outputIndex].lock.toBuffer()));
    tx.inputs[0].setScript(unlock);
    updateWallet(wallet, tx);
    txs.push(tx);
  }

  return txs;
}

// Hàm fund
function fund(wallet, tx) {
  tx.change(wallet.address);
  tx._fee = undefined; // Thay vì delete tx._fee

  for (const utxo of wallet.utxos) {
    if (!utxo.satoshis) {
      continue; // Bỏ qua UTXO trống (empty)
    }

    if (
      tx.inputs.length &&
      tx.outputs.length &&
      tx.inputAmount >= tx.outputAmount + tx.getFee()
    ) {
      break;
    }

    tx.from(utxo);
    tx.change(wallet.address);
    tx.sign(wallet.privkey);
  }
  if (tx.inputAmount < tx.outputAmount + tx.getFee()) {
    throw new Error("not enough funds");
  }
}

// Hàm updateWallet
function updateWallet(wallet, tx) {
  wallet.utxos = wallet.utxos.filter((utxo) => {
    for (const input of tx.inputs) {
      if (
        input.prevTxId.toString("hex") === utxo.txid &&
        input.outputIndex === utxo.vout
      ) {
        return false;
      }
    }
    return true;
  });

  tx.outputs.forEach((output, vout) => {
    if (output.script.toAddress().toString() === wallet.address) {
      wallet.utxos.push({
        txid: tx.hash,
        vout,
        script: output.script.toHex(),
        satoshis: output.satoshis,
      });
    }
  });
}

async function broadcast(tx, retry, walletIndex) {
  const body = {
    jsonrpc: "1.0",
    id: 0,
    method: "sendrawtransaction",
    params: [tx.toString()],
  };

  const options = {
    auth: {
      username: process.env.NODE_RPC_USER,
      password: process.env.NODE_RPC_PASS,
    },
  };

  while (true) {
    try {
      await axios.post(process.env.NODE_RPC_URL, body, options);
      break;
    } catch (e) {
      //   console.log(e);
      if (!retry) throw e;
      let msg =
        e.response &&
        e.response.data &&
        e.response.data.error &&
        e.response.data.error.message;
      if (msg && msg.includes("too-long-mempool-chain")) {
        console.warn("retrying, too-long-mempool-chain");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw e;
      }
    }
  }

  let wallet = JSON.parse(fs.readFileSync(WALLET_PATH(walletIndex)));

  updateWallet(wallet, tx);

  fs.writeFileSync(WALLET_PATH(walletIndex), JSON.stringify(wallet, 0, 2));
}

function chunkToNumber(chunk) {
  if (chunk.opcodenum == 0) return 0;
  if (chunk.opcodenum == 1) return chunk.buf[0];
  if (chunk.opcodenum == 2) return chunk.buf[1] * 255 + chunk.buf[0];
  if (chunk.opcodenum > 80 && chunk.opcodenum <= 96)
    return chunk.opcodenum - 80;
  return undefined;
}

async function extract(txid) {
  let resp = await axios.get(
    `https://dogechain.info/api/v1/transaction/${txid}`
  );
  let transaction = resp.data.transaction;
  let script = Script.fromHex(transaction.inputs[0].scriptSig.hex);
  let chunks = script.chunks;

  let prefix = chunks.shift().buf.toString("utf-8");
  if (prefix != "ord") {
    throw new Error("not a doginal");
  }

  let pieces = chunkToNumber(chunks.shift());

  let contentType = chunks.shift().buf.toString("utf-8");

  let data = Buffer.alloc(0);
  let remaining = pieces;

  while (remaining && chunks.length) {
    let n = chunkToNumber(chunks.shift());

    if (n !== remaining - 1) {
      txid = transaction.outputs[0].spent.hash;
      resp = await axios.get(
        `https://dogechain.info/api/v1/transaction/${txid}`
      );
      transaction = resp.data.transaction;
      script = Script.fromHex(transaction.inputs[0].scriptSig.hex);
      chunks = script.chunks;
      continue;
    }

    data = Buffer.concat([data, chunks.shift().buf]);
    remaining -= 1;
  }

  return {
    contentType,
    data,
  };
}

function server() {
  const app = express();
  const port = process.env.SERVER_PORT
    ? parseInt(process.env.SERVER_PORT)
    : 3000;

  app.get("/tx/:txid", (req, res) => {
    extract(req.params.txid)
      .then((result) => {
        res.setHeader("content-type", result.contentType);
        res.send(result.data);
      })
      .catch((e) => res.send(e.message));
  });

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    console.log();
    console.log(`Example:`);
    console.log(
      `http://localhost:${port}/tx/15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62e`
    );
  });
}

main().catch((e) => {
  let reason =
    e.response &&
    e.response.data &&
    e.response.data.error &&
    e.response.data.error.message;
  console.error(reason ? e.message + ":" + reason : e.message);
});
