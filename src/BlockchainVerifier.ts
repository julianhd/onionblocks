import { Verifier } from './Blockchain';
import { createHash } from "crypto";

class BlockchainVerifier {
    verifier(blockchain: Array<Block<BlockContent>>) {
        var i:any;
        for (i in blockchain) {
            const serialization = JSON.stringify(blockchain[i].data);
            const hash = createHash("sha256");
            hash.update(serialization);
            const digest = hash.digest("hex");
            if (blockchain[i].hash.substring(0,4) !== "000")
                throw console.error("The hash doesn't start with 000");
            
        }
            
    }
}