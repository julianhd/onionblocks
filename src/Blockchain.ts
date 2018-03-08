import { createHash } from "crypto"

export interface Chat {
	type: "chat"
	timestamp: number
	from: string
	message: string
}

export interface User {
	type: "user"
	timestamp: number
	name: string
	public: string
}

export interface OnionNode {
	type: "node"
	timestamp: number
	host: string
	public: string
}

export type BlockContent = Chat | User | OnionNode

export interface BlockData<T extends BlockContent> {
	sequence: number
	nonce: number
	previous: string | null
	content: T
}

export interface Block<T extends BlockContent> {
	data: BlockData<T>
	hash: string
}

export interface Verifier {
	verify(blockchain: Array<Block<BlockContent>>): void
}

export default class Blockchain {
	constructor(private verifier: Verifier) {}

	/**
	 * Returns all the blocks from the Blockchain Server
	 */
	async get(): Promise<Array<Block<BlockContent>>> {
		const data: BlockData<Chat> = {
			sequence: 0,
			nonce: 0,
			previous: null,
			content: {
				type: "chat",
				timestamp: Date.now(),
				from: "johnny",
				message: "wao",
			},
		}
		const hash = createHash("sha256")
		const serialization = JSON.stringify(data)
		hash.update(serialization)
		const digest = hash.digest("hex")
		return [
			{
				data,
				hash: digest,
			},
		]
	}

	async post<T extends BlockContent>(block: Block<T>) {
		const string = JSON.stringify(block, null, "\t")
		console.log(`POST ${string}`)
	}
}
