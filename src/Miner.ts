import http from "http"
import express from "express"
import Blockchain, { BlockData, Block, BlockContent } from "./Blockchain"

const app = express();

class Miner {
    blockdata: BlockData<BlockContent>;

    async mine(BlockContent) {
        // get the current blockchain
        const blockchain = new Blockchain(null);        // will have Verifier once it is created
        const blocks = await blockchain.get();
        
        // create a new block data
        const new_blocks: BlockData<BlockContent> = {
            sequence: 0,
            nonce: 0,
            previous: null,
            content: BlockContent
        }
        return 0;
    }
}

