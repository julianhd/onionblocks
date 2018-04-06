import Blockchain, {
	Entity,
	BlockContent,
	Block,
	OnionNode,
} from "./Blockchain"
import { Request, Exit, Relay } from "./request"
import NodeRSA from "node-rsa"
import got from "got"

const NODE_COUNT = 3

export default async function onionRouteRequest<T extends BlockContent>(
	entity: Entity<T>,
) {
	const blockchain = new Blockchain(null)
	const blocks = await blockchain.get()
	const [n1, n2, n3] = chooseRoutingNodes(blocks)

	const exit: Exit<T> = {
		type: "exit",
		content: entity,
	}
	const r3 = encrypt(exit, n3)

	const r2 = encryptRelay(n3.host, r3, n2)

	const r1 = encryptRelay(n2.host, r2, n1)

	const req: Request = {
		encrypted: r1,
	}
	const data = JSON.stringify(req)

	await got(`http://${n1.host}/request`, {
		method: "POST",
		body: data,
	})
}

function* chooseRoutingNodes(blocks: Array<Block<BlockContent>>) {
	const nodes = []
	for (const node of routingNodes(blocks)) {
		// TODO Filter out stale nodes
		nodes.push(node)
	}
	// TODO randomize selection
	yield nodes[0]
	yield nodes[1]
	yield nodes[2]
}

function* routingNodes(blocks: Array<Block<BlockContent>>) {
	for (const block of blocks) {
		if (block.data.content.type === "node") {
			yield block.data.content
		}
	}
}

function encryptRelay(next: string, encrypted: string, node: OnionNode) {
	const relay: Relay = {
		type: "relay",
		next,
		encrypted,
	}
	return encrypt(relay, node)
}

function encrypt(o: Object, node: OnionNode) {
	const key = new NodeRSA()
	key.importKey(node.public, "pkcs8-public")
	const data = JSON.stringify(o)
	const buffer = new Buffer(data)
	return key.encrypt(buffer, "base64")
}
