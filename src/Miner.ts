import http from "http"
import express from "express"
import Blockchain, { BlockData, Block, BlockContent } from "./Blockchain"
import { createHash } from "crypto";

const app = express();

class Miner {
    blockdata: BlockData<BlockContent>;

    async mine(BlockContent) {
        // get the current blockchain
        const blockchain = new Blockchain(null);        // will have Verifier once it is created
        const block = await blockchain.get();
        
        // create a new block data
        const new_block_data: BlockData<BlockContent> = {
            sequence: block[0].data.sequence + 1,       // set the sequence field > 1 than the previous one
            nonce: 0,
            previous: block[1].hash,
            content: BlockContent
        }
        var valid_hash = false;
        var miner_hash;
        // mine a new hash
        do {
            miner_hash = createHash("sha256")
            const miner_serialization = JSON.stringify(new_block_data)
            miner_hash.update(miner_serialization)
            const digest = miner_hash.digest("hex")
            if(digest.substr(0,2) == '000') {
                valid_hash = true;
            }
        } while(!valid_hash)
        
        const new_block: Block<BlockContent> = {
            data: new_block_data,
            hash: miner_hash
        }
        return new_block;
    }
}
