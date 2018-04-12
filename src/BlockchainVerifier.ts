import { Verifier } from './Blockchain';
import { createHash } from "crypto";
import { BlockContent } from './Blockchain';
import { Block } from './Blockchain';
import NodeRSA from "node-rsa";
import BlockchainTree from "./BlockTree"

export class MissingBlockError extends Error {
  constructor(...args: any[]) {
      super(...args);
      Error.captureStackTrace(this, MissingBlockError);
  }
}

export default class BlockchainVerifier {
    names: string[] = [];   // Keep track of all the names of users.
    map: Map<string, string> = new Map<string, string>();   // Maps names - publickey.

    verify (blockchainTree: BlockchainTree, block: Block<BlockContent>) {
        // console.log("BlochainVerifier: block -- " + JSON.stringify(block));
        // console.log();
        // console.log("BlockchainVerifier: blockchain -- " + JSON.stringify(blockchain));

        var {names, map} = this
        var parent = blockchainTree.getBlock(block.data.previous_uuid);

        // var cur = blockchain[i];
        const serialization = JSON.stringify(block.data);
        const hash = createHash("sha256");
        hash.update(serialization);
        const digest = hash.digest("hex");
        if (block.hash.substring(0, 3) !== "000") {
          throw console.error("The hash doesn't start with 000.");
        }

        if (parent == null && block.data.previous_uuid != null) {
          throw new MissingBlockError("A block might be missing from the chain");
        }

        // TODO this might be useless but for now let it there: Check if time permit
        if (parent != null && parent.data.uuid != block.data.previous_uuid) {
          throw console.error("The block isn't a child of the parent");
        }

        if (block.data.content.type === "user") {
            if (names.length == 0)
                names.push(block.data.content.name);
            else {
                var j: any;
                for (j in names) {
                    if (names[j] === block.data.content.name) {
                      throw console.error("This user's name already exists.");
                    }
                }
                names.push(block.data.content.name);
            }
            map.set(block.data.content.name, block.data.content.public);
        }
        else if (block.data.content.type === "chat") {
            var publicKey = map.get(block.data.content.from);
            if (publicKey === undefined) {
                throw console.error("Public key not found.");
            }
            var data = JSON.stringify(block.data.content);
            var key = new NodeRSA(publicKey, 'pkcs8-public');
            var buffer = new Buffer(data);
            if (!key.verify(buffer, block.data.signature, undefined, 'base64'))
                throw console.error("Invalid signature.");
        }
        if (digest != block.hash)
            throw console.error("The calculated hash doesn't match the claimed hash.");
    }
}
