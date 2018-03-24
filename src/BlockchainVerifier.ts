import { Verifier } from './Blockchain';
import { createHash } from "crypto";
import { BlockContent } from './Blockchain';
import { Block } from './Blockchain';

var names: String[] = [];   // Keep track of all the names of users.
var map: Map<String, String> = new Map<String, String>();   // Maps names - publickey.

class BlockchainVerifier {
    verify(block: Block<BlockContent>, blockchain: Array<Block<BlockContent>>) {
        var i:any;
        var preseq = 0;
        if (block != null)
            preseq = block.data.sequence;
        for (i in blockchain) {
            var cur = blockchain[i];
            const serialization = JSON.stringify(cur.data);
            const hash = createHash("sha256");
            hash.update(serialization);
            const digest = hash.digest("hex");
            if (cur.hash.substring(0,4) !== "000")
                throw console.error("The hash doesn't start with 000.");
            if (i == 0) {
                if (block == null)
                    preseq = cur.data.sequence;
            }
            else if (preseq != cur.data.sequence-1)
                throw console.error("The sequence isn't exactly 1 greater than the previous block.");
            if (cur.data.content.type === "user") {
                if (names.length == 0)
                    names.push(cur.data.content.name);
                else {
                    var j:any;
                    for (j in names) {
                        if (names[j] === cur.data.content.name)
                            throw console.error("This user's name already exists.");
                    }
                }
                map.set(cur.data.content.name, cur.data.content.public);
            }
            else if (cur.data.content.type === "chat") {
                var publicKey = map.get(cur.data.content.from);
                // What is the signature?
            }
            if (digest != cur.hash)
                throw console.error("The calculated hash doesn't match the claimed hash.");
        }
            
    }
}