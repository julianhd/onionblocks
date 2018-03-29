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
	signature: string
	content: T
}

export interface Entity<T extends BlockContent> {
	signature: string
	content: T
}

export interface Block<T extends BlockContent> {
	data: BlockData<T>
	hash: string
}

export interface Verifier {
	verify(block: Block<BlockContent>, blockchain: Array<Block<BlockContent>>): void
}

export type BlockHandlerCallback = (block: Block<BlockContent>) => void

export default class Blockchain {
	constructor(
		private verifier: Verifier | null,
		private callback: BlockHandlerCallback,
	) {
		process.nextTick(async () => {
			const blocks = await this.get()
			for (const block of blocks) {
				callback(block)
			}
		})
	}

	/**
	 * Returns all the blocks from the blockchain server.
	 */
	async get(): Promise<Array<Block<BlockContent>>> {
		const data: BlockData<Chat> = {
			sequence: 0,
			nonce: 0,
			previous: null,
			signature: "",
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

	/**
	 * Submits a new block to the blockchain server.
	 *
	 * @param block The block to be posted
	 */
	async post<T extends BlockContent>(block: Block<T>) {
		const string = JSON.stringify(block, null, "\t")
		console.log(`POST ${string}`)
	}
}
