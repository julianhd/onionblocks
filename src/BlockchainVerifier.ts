import { Verifier } from "./Blockchain"
import { createHash } from "crypto"
import { BlockContent } from "./Blockchain"
import { Block } from "./Blockchain"
import NodeRSA from "node-rsa"
import BlockchainTree from "./BlockTree"

export class MissingBlockError extends Error {
	constructor(...args: any[]) {
		super(...args)
		Error.captureStackTrace(this, MissingBlockError)
	}
}

export default class BlockchainVerifier {
	map: Map<string, string> = new Map<string, string>() // Maps public key -> name.

	verify(blockchainTree: BlockchainTree, block: Block<BlockContent>) {
		// console.log("BlochainVerifier: block -- " + JSON.stringify(block));
		// console.log();
		// console.log("BlockchainVerifier: blockchain -- " + JSON.stringify(blockchain));

		var parent = blockchainTree.getBlock(block.data.previous_uuid)

		// var cur = blockchain[i];
		const serialization = JSON.stringify(block.data)
		const hash = createHash("sha256")
		hash.update(serialization)
		const digest = hash.digest("hex")
		if (block.hash.substring(0, 3) !== "000") {
			throw new Error("The hash doesn't start with 000.")
		}

		if (parent == null && block.data.previous_uuid != null) {
			throw new MissingBlockError("A block might be missing from the chain")
		}

		// TODO this might be useless but for now let it there: Check if time permit
		if (parent != null && parent.data.uuid != block.data.previous_uuid) {
			throw new Error("The block isn't a child of the parent")
		} else if (block.data.content.type === "user") {
			this.map.set(block.data.content.public, block.data.content.name)
		} else if (block.data.content.type === "chat") {
			var publicKey = block.data.public
			// Less strict for development testing - check if public key found first
			if (this.map.has(publicKey)) {
				const expectedName = this.map.get(publicKey)
				if (expectedName !== block.data.content.from) {
					throw new Error("Chat message was not signed by " + expectedName)
				}
			}
			var data = JSON.stringify(block.data.content)
			var key = new NodeRSA(publicKey, "pkcs8-public")
			var buffer = new Buffer(data)
			if (!key.verify(buffer, block.data.signature, undefined, "base64"))
				throw new Error("Invalid signature.")
		}
		if (digest != block.hash)
			throw new Error("The calculated hash doesn't match the claimed hash.")
	}
}
