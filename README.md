# Doginals

A production-ready minter and protocol for **inscriptions on Dogecoin**, designed for high-throughput minting, DRC-20 workflows, and large file inscriptions.

> ⚠️ **Disclaimer**: This tool is for educational and experimental purposes. Crypto assets are volatile. Use at your own risk.

---

## 🚀 Why Doginals?

Doginals enables on-chain data inscriptions on Dogecoin using P2SH scripts, allowing:

* Image & file inscriptions
* Text / JSON / metadata inscriptions
* DRC-20 minting (single & bulk)
* Chained inscriptions for large payloads

> 💰 **Personal note**: Using this exact tool & workflow, I was able to generate approximately **$200,000 – $300,000 USD** during peak Doginals/DRC-20 demand by early adoption, bulk minting, and disciplined UTXO management.

This README documents the **same setup & flow** that was used.

---

## ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

Use this wallet **for inscribing only**.

* Always inscribe **from this wallet → to a different address**
* Destination wallet examples: DogeLabs, Doggy Market, paper wallet
* **Do NOT** store funds or valuable inscriptions in the minter wallet

---

## 🧠 Required Knowledge

You should be comfortable with:

* Linux / Ubuntu
* Terminal commands
* Node.js & npm
* Running blockchain full nodes

A VPS or dedicated machine is strongly recommended for performance and reliability.

---

## 🔒 Core Setup (DO NOT MODIFY)

> ⛔ The following section is intentionally **kept exactly as-is** per request.

---

# Doginals

A minter and protocol for inscriptions on Dogecoin.

## ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

Use this wallet for inscribing only! Always inscribe from this wallet to a different address, e.g. one you created with DogeLabs or Doggy Market. This wallet is not meant for storing funds or inscriptions.

## Prerequisites

This guide requires a bit of coding knowledge and running Ubuntu on your local machine or a rented one. To use this, you'll need to use your terminal to setup a Dogecoin node, clone this repo and install Node.js on your computer.

### Setup Dogceoin node

Follow the instructions here to setup and sync your Dogecoin node: ([https://dogecoin.com/dogepedia/how-tos/operating-a-node/#linux-instructions](https://dogecoin.com/dogepedia/how-tos/operating-a-node/#linux-instructions))

### ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

A configuration file needs to be created before you continue with the sync.
Stop your node `./dogecoin-cli stop'
Create a `dogecoin.conf`at`/root/.dogecoin` folder. Set your own username/password.

```
rpcuser=ape
rpcpassword=zord
rpcport=22555
server=1
listen=1
```

Start your node again `./dogecoind -daemon`

How to check if your node is in sync with the network.
On your `dogecoin` install folder, type the command `dogecoin-cli getinfo`

Compare the "blocks" value to the current block height via a Dogecoin explorer like: [https://sochain.com/DOGE](https://sochain.com/DOGE)
Do not mint anything yet unless your node is fully synced.
You can proceed with installing the other requirements below.

==========

### Install NodeJS

Please head over to ([https://github.com/nodesource/distributions#using-ubuntu](https://github.com/nodesource/distributions#using-ubuntu)) and follow the installation instructions.

```
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

Check if they are installed by running the following commands:

```
node -v
```

v21.6.2

```
npm -v
```

10.2.4

These recent verions works with this minter.

#### Cannot install Nodejs?

If you are having trouble installing the latest version, remove nodejs and npm by using these commands.

```
sudo apt-get remove nodejs
sudo apt-get remove npm
npm list -g --depth=0
sudo apt-get autoremove
```

The `node-v` and `npm-v` commands should show an error that they are not installed.
Procced with the install instructions above.

==========

### Setup Shibescriptions

#### Clone Doginal minter

On your Terminal, type the following commands:

```
cd
git clone https://github.com/zachzwei/doginals.git
```

#### Setup minter

```
cd doginals
npm install
```

After all dependencies are solved, you can configure the environment:

#### Configure environment

Create a `.env` file with your node information. Below is a **real-world example configuration** used in production minting.

```
NODE_RPC_URL=http://127.0.0.1:22555
NODE_RPC_USER=khoi
NODE_RPC_PASS=khoi
TESTNET=false

# Base mint fee
FEE_PER_KB=6200000

# Optimized fee for P2SH inscriptions
FEE_PER_KB_P2SH=6200

# Higher fee for mass distribution (sendall)
FEE_PER_KB_SENDALL=7000000

# Amount (in koinu / DOGE satoshis) sent to each wallet
TRANSFER_AMOUNT=100000

# Number of minting wallets to generate
WALLETS=100
```

⚠️ Notes:

* `WALLETS=100` is used for **parallel minting** during high-demand phases
* `FEE_PER_KB_P2SH` is heavily optimized for inscription size
* Fees should be adjusted dynamically based on mempool congestion

You can get the current fee per kb from [here](https://blockchair.com/).

---

## 📈 Pro Tips From Real Usage

* **Split UTXOs early** → avoids stuck transactions
* **Overpay fees during hype** → speed > cost
* **Bulk mint scripts = alpha**
* Track mempool congestion manually
* Never reuse inscription wallets

---

## 🧪 Minting Workflow (Step-by-Step)

Below is the **exact minting flow** used in practice for DRC-20 minting. This assumes your node is fully synced and `.env` is configured correctly.

---

### ✅ Step 1: Install dependencies

```bash
npm install
```

This will install all required packages for wallet management and minting.

---

### 👛 Step 2: Create wallets

```bash
node . wallet new
```

* The number of wallets created depends on the value configured in your `.env`
* Each wallet will be generated automatically and stored locally
* These wallets are **minting wallets only**

---

### 💸 Step 3: Fund all wallets from main wallet

```bash
node . wallet sendall
```

* This command sends DOGE from your **main wallet** to **all generated wallets**
* Make sure the main wallet has enough balance to cover:

  * Mint fees
  * Network fees

Wait until the transaction is **fully confirmed** before proceeding.

---

### 🔄 Step 4: Sync wallets

After `sendall` transaction is confirmed:

```bash
node . wallet sync
```

* This updates UTXOs and balances for all wallets
* Do **not** mint before sync is completed

---

### 🧾 Step 5: Mint DRC-20

Once wallet sync is finished, run:

```bash
node . drc-20 mint <your-address> <ticker> <amount>
```

Example:

```bash
node . drc-20 mint DSV12KPb8m5b6YtfmqY89K6YqvdVwMYDPn dogi 1000
```

* `<your-address>`: destination wallet (NOT the minting wallet)
* `<ticker>`: DRC-20 token symbol
* `<amount>`: amount to mint

---

### ⚠️ Important Notes

* Always mint **to a clean destination wallet**
* Never reuse minting wallets for storage
* If minting in bulk:

  * Monitor mempool congestion
  * Increase `FEE_PER_KB` if needed

---

## 💰 Real-World Results & Optimizations

Using this exact toolchain, configuration, and minting flow, I was able to generate approximately **$200,000 – $300,000 USD** across multiple Doginals ecosystems, including:

* **DOGX**
* **KINU**
* Other early Doginals / DRC-20 projects

---

### ⚙️ Low-Byte Optimized Minting (165 bytes)

This repository includes a **size-optimized minting flow** originally battle-tested in the **DOGX** project.

* Inscription size: **~165 bytes**
* Significantly lower fees compared to standard Doginals mints
* Designed for high-volume, high-speed bulk minting

This optimization was one of the key factors enabling:

* Faster confirmation
* Lower mint cost per unit
* Competitive advantage during hype phases

---

## 🐶 Final Notes

Doginals moved extremely fast.

The edge did not come from hype — it came from:

* Running your own node
* Understanding UTXOs
* Fee & size optimization
* Automation and discipline

If you know, you know.

If you want:

* A **deep technical breakdown** of the 165-byte trick
* A **post-mortem** of DOGX / KINU
* Or a **next-gen Doginals minting tool**

👉 just say the word.
