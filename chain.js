import { Block, BlockHeader } from "./block.js";
import moment from "moment/moment.js";

let getGenesisBlock = () => {
  let blockHeader = new BlockHeader(
    1,
    null,
    "0x1bc3300000000000000000000000000000000000000000000",
    moment().unix()
  );

  return new Block(blockHeader, 0, null);
};

export const getLatestBlock = () => (
  blockchain[blockchain.length - 1]
);

export const addBlock = (newBlock) => {
  let prevBlock = getLatestBlock();
  console.log(newBlock);
  console.log(typeof newBlock.blockHeader.previousBlockHeader);
    console.log(typeof prevBlock.blockHeader.merkleRoot);
    console.log(newBlock.blockHeader.previousBlockHeader == prevBlock.blockHeader.merkleRoot);
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

export const getBlock = (index) => {
  if (blockchain.length - 1 >= index) {
    return blockchain[index];
  } else {
    return null;
  }
};

export const blockchain = [getGenesisBlock()];