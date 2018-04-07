import http from "http"
import express from "express"
import Blockchain, {
	BlockData,
	Block,
	BlockContent,
	Entity,
} from "./Blockchain"
import { createHash } from "crypto"

const app = express()

export default class Miner {
	async mine(entity: Entity<any>) {
		// get the current blockchain
		const blockchain = new Blockchain(null) // will have Verifier once it is created
		const blocks = await blockchain.get()
		// console.log("Miner: blocks -- " + JSON.stringify(blocks));
		const previous_block = blocks[blocks.length - 1]

		var sequence_num = 0;
		if (previous_block) {
			sequence_num = previous_block.data.sequence + 1;
		}

		// create a new block data
		const new_block_data: BlockData<BlockContent> = {
			sequence: sequence_num, // set the sequence field > 1 than the previous one
			nonce: 0,
			previous: (previous_block) ? previous_block.hash : null,
			signature: entity.signature, // TODO FIX
			content: entity.content,
		}
		var valid_hash = false
		var miner_hash
		let digest;
		do {
			let miner_serialization = JSON.stringify(new_block_data)

			// mine a new hash
			miner_hash = createHash("sha256")
			miner_hash.update(miner_serialization)
			digest = miner_hash.digest("hex")
			if (digest.substr(0, 3) == "000") {
				valid_hash = true
			}
			new_block_data.nonce++
		} while (!valid_hash)
		new_block_data.nonce--

		const new_block: Block<BlockContent> = {
			data: new_block_data,
			hash: digest,
		}
		return new_block
	}
}
