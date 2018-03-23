import http from "http"
import express from "express"
import Blockchain, { BlockData, Block, BlockContent } from "./Blockchain"
import { createHash } from "crypto";

// New miner
interface miner {
    sequence : number;
    content : string;
    previous : string;
    nonce : number;
    data : BlockData<BlockContent>;
    mine(): Block<BlockContent>;
    new_blockdata(BlockData);
    new_block(data) : Block<BlockContent>;
}

function new_blockdata(BlockData) {
    // new block data
    const data: BlockData<BlockContent> = {
        sequence: 0,
        previous: null,
        content: null, // content type should be User.
        nonce: 0 
    
    }
    return data;
}

function new_block(data) {
    const hash = createHash("sha256");
    const serialize_blockdata = JSON.stringify(data);
    hash.update(serialize_blockdata);
    
    // TO-DO
    // Check if the hash starts with 3 zeroes
}
function mine() {
    // new block
}  