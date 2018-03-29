import { Verifier } from './Blockchain';
import { createHash } from "crypto";
import { BlockContent } from './Blockchain';
import { Block } from './Blockchain';
import NodeRSA from "node-rsa"


class BlockchainVerifier {
    names: string[] = [];   // Keep track of all the names of users.
    map: Map<string, string> = new Map<string, string>();   // Maps names - publickey.

    // getPublicKey(name: String, blockchain: Array<Block<BlockContent>>) {
    //     for (var block of blockchain) {
    //         if (block.data.content.type == "user") {
    //             return block.data.content.public;
    //         }
    //     }
    //     throw console.error("User not found.");
    // }

    verify(block: Block<BlockContent>, blockchain: Array<Block<BlockContent>>) {
        var {names, map} = this
        var i: any;
        var preseq = 0;
        if (block != null)
            preseq = block.data.sequence;
        for (i in blockchain) {
            var cur = blockchain[i];
            const serialization = JSON.stringify(cur.data);
            const hash = createHash("sha256");
            hash.update(serialization);
            const digest = hash.digest("hex");
            if (cur.hash.substring(0, 4) !== "000")
                throw console.error("The hash doesn't start with 000.");
            if (i == 0) {
                if (block == null)
                    preseq = cur.data.sequence;
            }
            else if (preseq != cur.data.sequence - 1)
                throw console.error("The sequence isn't exactly 1 greater than the previous block.");
            if (cur.data.content.type === "user") {
                if (names.length == 0)
                    names.push(cur.data.content.name);
                else {
                    var j: any;
                    for (j in names) {
                        if (names[j] === cur.data.content.name)
                            throw console.error("This user's name already exists.");
                    }
                    names.push(cur.data.content.name);
                }
                map.set(cur.data.content.name, cur.data.content.public);
            }
            else if (cur.data.content.type === "chat") {
                var publicKey = map.get(cur.data.content.from);
                if (publicKey === undefined) {
                    throw console.error("Public key not found.");
                }
                // var key = this.getPublicKey(cur.data.content.from, blockchain);
                var string = JSON.stringify(cur.data.content);
                var key = new NodeRSA(publicKey);
                var buffer = new Buffer(string);
                var base64String = buffer.toString('base64') as NodeRSA.Data;
                if (!key.verify(base64String, cur.data.signature, undefined, 'base64'))
                    throw console.error("Invalid signature.");
            }
            if (digest != cur.hash)
                throw console.error("The calculated hash doesn't match the claimed hash.");
        }

    }
}