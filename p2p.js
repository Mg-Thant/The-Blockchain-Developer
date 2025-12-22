import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import {
  addBlock,
  getBlock,
  blockchain,
  getLatestBlock,
  generateNextBlock,
  createDB,
  storeBlock,
} from "./chain.js";
import { CronJob } from "cron";
import { write } from "fs";

const swarm = new Hyperswarm();
const peers = {};
let connSeq = 0;
let registeredMiners = [];
let lastBlockMinedBy = null;
let latestBlock = 0;
let networkLatestblock = 0;

const channel = "ZeeKwek";
const topic = crypto.createHash("sha256").update(channel).digest();

const myPeerId = crypto.randomBytes(32).toString("hex");
console.log("My peer id: " + myPeerId);
createDB(myPeerId.toString("hex"));

let MessageType = {
  REQUEST_LATEST_BLOCK: "requestLatestBlock",
  LATEST_BLOCK: "latestBlock",
  RECEIVE_NEXT_BLOCK: "reveiveNextBlock",
  RECEIVE_NEW_BLOCK: "receiveNewBlock",
  REQUEST_BLOCK: "requestBlock",
  REQUEST_ALL_REGISTER_MINERS: "requestAllRegisterMiners",
  REGISTER_MINER: "registerMiner",
};

swarm.on("connection", (conn, info) => {
  const seq = connSeq++;
  const peerId = info.publicKey.toString("hex");
  console.log(`Connected #${seq} to peer: ${peerId}`);

  peers[peerId] = { conn, seq };

  conn.on("data", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(
        "-------------------- Received Message -----------------------"
      );
      console.log(
        `From: ${peerId}\nType: ${message.type}\nData: ${JSON.stringify(
          message.data
        )}`
      );
      console.log(
        "-------------------------------------------------------------"
      );

      switch (message.type) {
        case MessageType.REQUEST_LATEST_BLOCK:
          console.log(
            "-------------------- REQUEST_LATEST_BLOCK --------------------"
          );
          let latestBlock = getLatestBlock();
          console.log("Latest block: " + JSON.parse(latestBlock));
          writeMessageToPeers(MessageType.LATEST_BLOCK, latestBlock);
          console.log(
            "-------------------- REQUEST_LATEST_BLOCK --------------------"
          );
          break;
        case MessageType.LATEST_BLOCK:
          console.log("-------------------- LATEST_BLOCK --------------------");
          networkLatestblock = JSON.parse(JSON.stringify(message.data));
          console.log("Networklatest block: " + networkLatestblock);
          console.log("-------------------- LATEST_BLOCK --------------------");
          break;
        case MessageType.REQUEST_BLOCK:
          console.log("--------------------REQUEST_BLOCK--------------------");
          let requestedIndex = JSON.parse(JSON.stringify(message.data)).index;
          let requestedBlock = getBlock(requestedIndex);
          if (requestedBlock) {
            writeMessageToPeerId(
              peerId.toString("hex"),
              MessageType.RECEIVE_NEXT_BLOCK,
              requestedBlock
            );
          } else {
            console.log("No block found @index: " + requestedIndex);
          }
          console.log("--------------------END REQUEST_BLOCK");
          break;
        case MessageType.RECEIVE_NEXT_BLOCK:
          console.log(
            "--------------------RECEIVE_NEXT_BLOCK--------------------"
          );
          let block = JSON.parse(JSON.stringify(message.data));
          addBlock(block);
          storeBlock(block);
          console.log(JSON.stringify(blockchain));
          let nextBlockIndex = getLatestBlock().index + 1;
          console.log("request next block @index: " + nextBlockIndex);
          writeMessageToPeers(MessageType.REQUEST_BLOCK, {
            index: nextBlockIndex,
          });
          console.log(
            "--------------------END RECEIVE_NEXT_BLOCK--------------------"
          );
          break;
        case MessageType.RECEIVE_NEW_BLOCK:
          if (
            message.from !== myPeerId.toString("hex")
          ) {
            console.log(
              "-------------------- Receive New Block --------------------" +
                message.to
            );
            let block = JSON.parse(JSON.stringify(message.data));
            addBlock(block);
            storeBlock(block);
            console.log(JSON.stringify(blockchain));
            console.log(
              "-------------------- Receive New Block --------------------" +
                message.to
            );
          }
          break;
        case MessageType.REQUEST_ALL_REGISTER_MINERS:
          console.log(
            "-------------------- Request all register miners --------------------" +
              message.to
          );
          writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
          let registerMinerTemp = JSON.parse(JSON.stringify(message.data));
          if(registerMinerTemp != null) {
            registeredMiners = registerMinerTemp;
          }
          console.log(
            "-------------------- Request all register miners --------------------" +
              message.to
          );
          break;
        case MessageType.REGISTER_MINER:
          console.log(
            "-------------------- Register Miner --------------------" +
              message.to
          );
          let miners = JSON.stringify(message.data);
          registeredMiners = JSON.parse(miners);
          console.log(registeredMiners);
          console.log(
            "-------------------- Register Miner --------------------" +
              message.to
          );
          break;
      }
    } catch (err) {
      console.log("Received non-JSON data:", data.toString());
    }
  });

  conn.on("close", () => {
    console.log(`Connection ${seq} closed, peerId: ${peerId}`);
    if (peers[peerId].seq === seq) {
      delete peers[peerId];
      console.log(
        "-------------------- Registered miners before : " +
          JSON.stringify(registeredMiners)
      );
      let index = registeredMiners.indexOf(peerId);
      if (index > -1) {
        registeredMiners.splice(index, 1);
      }
      console.log(
        "-------------------- Registered miners end: " +
          JSON.stringify(registeredMiners)
      );
    }
  });

  conn.on("error", (err) => console.error(`Conn error: ${err.message}`));
});

const discovery = swarm.join(topic, { client: true, server: true });

discovery.flushed().then(() => {
  console.log(`Joined channel: ${channel} and finished initial discovery.`);
});

function writeMessageToPeers(type, data) {
  for (const id in peers) {
    sendMessage(id, type, data);
  }
}

function writeMessageToPeerId(toId, type, data) {
  if (peers[toId]) {
    sendMessage(toId, type, data);
  }
}

function sendMessage(id, type, data) {
  if (peers[id] && peers[id].conn) {
    console.log(`Sending ${type} to: ${id}`);
    peers[id].conn.write(
      JSON.stringify({
        to: id,
        from: myPeerId,
        type: type,
        data: data,
      })
    );
  }
}

setTimeout(() => {
  console.log(
    `Attempting to send message to ${Object.keys(peers).length} peers...`
  );
  writeMessageToPeers("Hello", { text: "Hi from Hyperswarm!" });
}, 10000);

setTimeout(() => {
  latestBlock = getLatestBlock().index;
  writeMessageToPeers(MessageType.REQUEST_BLOCK, {
    index: latestBlock + 1,
  });
}, 12000);

setTimeout(() => {
  writeMessageToPeers(MessageType.REQUEST_LATEST_BLOCK, null);
}, 12000);

// setTimeout(() => {
//   writeMessageToPeers(MessageType.REQUEST_BLOCK, {
//     index: blockchain[blockchain.length - 1] + 1,
//   });
// }, 12000);

setTimeout(() => {
  writeMessageToPeers(MessageType.REQUEST_ALL_REGISTER_MINERS, null);
}, 14000);

setTimeout(() => {
  registeredMiners.push(myPeerId.toString("hex"));
  console.log(
    "---------------------------- Start Register my miner ----------------------------"
  );
  console.log(registeredMiners);
  writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
  console.log(
    "---------------------------- End Register my miner ----------------------------"
  );
}, 16000);

const job = new CronJob("45 * * * * *", () => {
  // let index = 0;
  // if (lastBlockMinedBy) {
  //   let newIndex = registeredMiners.indexOf(lastBlockMinedBy);
  //   index =
  //     newIndex + 1 > registeredMiners.length - 1 &&
  //     latestBlock === networkLatestblock
  //       ? 0
  //       : newIndex + 1;
  //   console.log(index);
  // }

  // lastBlockMinedBy = registeredMiners[index];
  // console.log(
  //   "-------------------- Requesting new block from " +
  //     registeredMiners[index] +
  //     " index " +
  //     index
  // );
  const currentBlockIndex = getLatestBlock().index;

  const nextTurnIndex = (currentBlockIndex + 1) % registeredMiners.length;
  const scheduledMiner = registeredMiners[nextTurnIndex];
  console.log("----||||| Current block index: " + currentBlockIndex);
  console.log("----||||| Miner: " + scheduledMiner);
  console.log(JSON.stringify(registeredMiners));
  if (scheduledMiner === myPeerId.toString("hex")) {
    console.log("-------------------- Create next block --------------------");
    let newBlock = generateNextBlock(null);
    addBlock(newBlock);
    console.log(JSON.stringify(newBlock));
    writeMessageToPeers(MessageType.RECEIVE_NEW_BLOCK, newBlock);
    console.log(JSON.stringify(blockchain));
    console.log("-------------------- Create next block --------------------");
  }
});

job.start();
