import { Block, BlockHeader } from "./block.js";
import moment from "moment/moment.js";
import CryptoJS from "crypto-js";
import { Level } from "level";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

let db;

export let createDB = (peerId) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  console.log(__dirname);
  let dir = __dirname + "/db/" + peerId;
  console.log("DB directory path: " + dir);
  console.log("Error");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    db = new Level(dir);
    storeBlock(getGenesisBlock());
  }
};

export let storeBlock = (newBlock) => {
  db.put(newBlock.index, JSON.stringify(newBlock), (err) => {
    if (err) {
      console.log("Error saving to database!");
      return;
    }
    console.log(
      "Complete block data saving to database index: " + newBlock.index
    );
  });
};

export let getBlockFromDB = (index, res) => {
  db.get(index, (err, value) => {
    if (err) {
      return res.send(JSON.stringify(err));
    }
    return res.send(value);
  });
};

export let getGenesisBlock = () => {
  let blockHeader = new BlockHeader(
    1,
    null,
    "0x1bc3300000000000000000000000000000000000000000000",
    moment().unix()
  );

  return new Block(blockHeader, 0, null);
};

export const getLatestBlock = () => blockchain[blockchain.length - 1];

export const addBlock = (newBlock) => {
  let prevBlock = getLatestBlock();
  console.log(newBlock);
  if (
    prevBlock.index < newBlock.index &&
    newBlock.blockHeader.previousBlockHeader ===
      prevBlock.blockHeader.merkleRoot
  ) {
    blockchain.push(newBlock);
    return true;
  } else {
    return false;
  }
};

export const generateNextBlock = (txns) => {
  const prevBlock = getLatestBlock();
  const prevMerkleRoot = prevBlock.blockHeader.merkleRoot;
  const nextIndex = prevBlock.index + 1;
  const nextTime = moment().unix();
  const nextMerkleRoot = CryptoJS.SHA256(
    1,
    prevMerkleRoot,
    nextTime
  ).toString();

  const blockHeader = new BlockHeader(
    1,
    prevMerkleRoot,
    nextMerkleRoot,
    nextTime
  );
  const newBlock = new Block(blockHeader, nextIndex, txns);
  // blockchain.push(newBlock);
  storeBlock(newBlock);
  return newBlock;
};

export const getBlock = (index) => {
  if (blockchain.length - 1 >= index) {
    return blockchain[index];
  } else {
    return null;
  }
};

export const blockchain = [getGenesisBlock()];
