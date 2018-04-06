import http from "http"
import express from "express"
import Blockchain, { BlockData, Block, BlockContent } from "./Blockchain"
import { createHash } from "crypto"

const app = express()

class Miner {
	async mine(content: BlockContent) {
		// get the current blockchain
		const blockchain = new Blockchain(null) // will have Verifier once it is created
		const blocks = await blockchain.get()

		const previous_block = blocks[blocks.length - 1]

		// create a new block data
		const new_block_data: BlockData<BlockContent> = {
			sequence: previous_block.data.sequence + 1, // set the sequence field > 1 than the previous one
			nonce: 0,
			previous: previous_block.hash,
			signature: "", // TODO FIX
			content: content,
		}
		var valid_hash = false
		var miner_hash
		const miner_serialization = JSON.stringify(new_block_data)
		// mine a new hash
		do {
			miner_hash = createHash("sha256")
			miner_hash.update(miner_serialization)
			const digest = miner_hash.digest("hex")
			if (digest.substr(0, 2) == "000") {
				valid_hash = true
			}
			new_block_data.nonce++
		} while (!valid_hash)

		const new_block: Block<BlockContent> = {
			data: new_block_data,
			hash: miner_hash.digest("hex"),
		}
		return new_block
	}
}
