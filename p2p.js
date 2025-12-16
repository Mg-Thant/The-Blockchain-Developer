import Hyperswarm from 'hyperswarm';
import crypto from 'crypto';

const swarm = new Hyperswarm();
const peers = {};
let connSeq = 0;

const channel = "ZeeKwek";
const topic = crypto.createHash('sha256').update(channel).digest();

const myPeerId = crypto.randomBytes(32).toString('hex');
console.log("My peer id: " + myPeerId);

swarm.on('connection', (conn, info) => {
    const seq = connSeq++;
    const peerId = info.publicKey.toString('hex'); 
    console.log(`Connected #${seq} to peer: ${peerId}`);

    peers[peerId] = { conn, seq };

    conn.on('data', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log("-------------------- Received Message -----------------------");
            console.log(`From: ${peerId}\nType: ${message.type}\nData: ${JSON.stringify(message.data)}`);
            console.log("-------------------------------------------------------------");
        } catch (err) {
            console.log("Received non-JSON data:", data.toString());
        }
    });

    conn.on('close', () => {
        console.log(`Connection ${seq} closed, peerId: ${peerId}`);
        delete peers[peerId];
    });

    conn.on('error', (err) => console.error(`Conn error: ${err.message}`));
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

function sendMessage(id, type, data) {
    if (peers[id] && peers[id].conn) {
        console.log(`Sending ${type} to: ${id}`);
        peers[id].conn.write(JSON.stringify({
            to: id,
            from: myPeerId,
            type: type,
            data: data
        }));
    }
}

setTimeout(() => {
    console.log(`Attempting to send message to ${Object.keys(peers).length} peers...`);
    writeMessageToPeers("Hello", { text: "Hi from Hyperswarm!" });
}, 10000);