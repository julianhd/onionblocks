import { createHash } from "crypto"
import got from "got"

const MASTER_HOST = "127.0.0.1"
const MASTER_PORT = 8082

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
	verify(
		block: Block<BlockContent>,
		blockchain: Array<Block<BlockContent>>,
	): void
}

export type BlockHandlerCallback = (block: Block<BlockContent>) => void

export default class Blockchain {
	constructor(
		private verifier: Verifier | null,
		private callback?: BlockHandlerCallback,
	) {
		process.nextTick(async () => {
			const blocks = await this.get()
			if (callback != null) {
				for (const block of blocks) {
					callback(block)
				}
			}
		})
	}

	/**
	 * Returns all the blocks from the blockchain server.
	 */
	async get(): Promise<Array<Block<BlockContent>>> {
		const response = await got(
			`http://${MASTER_HOST}:${MASTER_PORT}/blockchain?since=0`,
		)
		const blockchain: Array<Block<BlockContent>> = JSON.parse(response.body)
		return blockchain
	}

	/**
	 * Submits a new block to the blockchain server.
	 *
	 * @param block The block to be posted
	 */
	async post<T extends BlockContent>(block: Block<T>) {
		const data = JSON.stringify(block)
		await got(`http://${MASTER_HOST}:${MASTER_PORT}/block`, {
			method: "POST",
			body: data,
		})
	}
}
