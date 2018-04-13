import { createHash } from "crypto"
import got from "got"
import BlockchainTree, {
	BlockchainTreeStruct,
	TreeNode,
	UUIDMap,
} from "./BlockTree"
import { setInterval } from "timers"

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
	port: number
	public: string
}

export type BlockContent = Chat | User | OnionNode

export interface BlockData<T extends BlockContent> {
	uuid: string
	sequence: number
	nonce: number
	previous: string | null
	previous_uuid: string | null
	signature: string
	public: string
	content: T
}

export interface Entity<T extends BlockContent> {
	signature: string
	public: string
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
	private uuids: Set<string> = new Set<string>()
	constructor(
		private verifier: Verifier | null,
		private blocktree?: BlockchainTree,
	) {}

	/**
	 * Returns all the blocks from the blockchain server.
	 */
	async get(): Promise<Array<Block<BlockContent>>> {
		if (this.blocktree) {
			return this.blocktree.getStruct().blockchain;
		}
		else {
			const response = await got(
				`http://${MASTER_HOST}:${MASTER_PORT}/blockchain`,
			)
			const blocktree: BlockchainTreeStruct = JSON.parse(response.body);
			const blockchain: Array<Block<BlockContent>> = blocktree.blockchain;

			// console.log("Blockchain: get -- " + JSON.stringify(blockchain));
			return blockchain
		}

	}

	/**
	 * Submits a new block to the blockchain server.
	 *
	 * @param block The block to be posted
	 */
	async post<T extends BlockContent>(block: Block<T>) {
		// console.log("Blockchain: posting a new block");
		await got(`http://${MASTER_HOST}:${MASTER_PORT}/block`, {
			method: "POST",
			body: block,
			json: true,
		})
	}

	/**
	 * Listen for new blocks on the chain
	 *
	 * @param {BlockHandlerCallback} callback : Handler for new blocks
	 */
	listenBlocks(callback: BlockHandlerCallback) {
		if (this.blocktree) {
			this.blocktree.listen(callback)
		}
		else {
			throw new Error("Invalid operation no blockchain associated");
		}
	}

	/**
   * Returns the head block from the longest chain in the tree.
   *
   * @returns {Block | null} returns the head of the longest chain, null if tree is empty.
   */
	getHead() {
		if (this.blocktree) {
			return this.blocktree.getHead();
		}
		else {
			throw new Error("Invalid operation no blockchain associated");
		}
	}

	/**
	 * Returns a list of up to 'count' random and active OnionNode.
	 *
	 * @param {number} count: Number of peers to retrieve
	 *
	 * @returns {Array<OnionNode>} List of 'count' random peers.
	 */
	getRandomNodeList(count: number) {
		if (this.blocktree) {
			return this.blocktree.getRandomNodeList(count);
		}
		else {
			throw new Error("Invalid operation no blockchain associated");
		}
	}
}
