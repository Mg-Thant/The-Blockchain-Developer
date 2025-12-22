import EC from "elliptic";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const ec = EC.ec("secp256k1");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const privateKeyLocation = __dirname + "/wallet/private_key";
console.log("Private key loc: " + privateKeyLocation);
export const initWallet = () => {
  let privateKey;

  if (fs.existsSync(privateKeyLocation)) {
    const buffer = fs.readFileSync(privateKeyLocation, "utf-8");
    privateKey = buffer.toString();
    console.log("Private Key: " + privateKey);
  } else {
    privateKey = generatePrivateKey();
    console.log(
      "-------------------- Private Key generation complete --------------------"
    );
    fs.writeFileSync(privateKeyLocation, privateKey);
  }

  const key = ec.keyFromPrivate(privateKey, "hex");
  const publicKey = key.getPublic().encode("hex");
  return {
    privateKeyLocation: privateKeyLocation,
    publicKey: publicKey,
  };
};

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

// let retVal = initWallet();
// console.log(JSON.stringify(retVal));
