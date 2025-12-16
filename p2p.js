import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { addBlock, getBlock, blockchain, getLatestBlock } from "./chain.js";

const swarm = new Hyperswarm();
const peers = {};
let connSeq = 0;

const channel = "ZeeKwek";
const topic = crypto.createHash("sha256").update(channel).digest();

const myPeerId = crypto.randomBytes(32).toString("hex");
console.log("My peer id: " + myPeerId);

let MessageType = {
  REQUEST_LATEST_BLOCK: "requestLatestBlock",
  LATEST_BLOCK: "latestBlock",
  RECEIVE_NEXT_BLOCK: "reveiveNextBlock",
  REQUEST_BLOCK: "requestBlock",
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
          addBlock(JSON.parse(JSON.stringify(message.data)));
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
      }
    } catch (err) {
      console.log("Received non-JSON data:", data.toString());
    }
  });

  conn.on("close", () => {
    console.log(`Connection ${seq} closed, peerId: ${peerId}`);
    delete peers[peerId];
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
  writeMessageToPeers(MessageType.REQUEST_BLOCK, {
    index: getLatestBlock().index + 1,
  });
}, 5000);
