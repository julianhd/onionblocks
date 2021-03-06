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
	blockchain: Blockchain
) {
	const [n1, n2, n3] = blockchain.getRandomNodeList(3);
	console.log("onionRouteRequest: node chosen -- " + JSON.stringify(n1) + " :: " + JSON.stringify(n2) + " :: " + JSON.stringify(n3));

	const exit: Exit<T> = {
		type: "exit",
		content: entity,
	}
	const r3 = encrypt(exit, n3)

	const r2 = encryptRelay(`${n3.host}:${n3.port}`, r3, n2)

	const r1 = encryptRelay(`${n2.host}:${n2.port}`, r2, n1)

	const req: Request = {
		encrypted: r1,
	}

	// console.log("onionRouteRequest: sending request -- " + JSON.stringify(n1));
	await got(`http://${n1.host}:${n1.port}/request`, {
		method: "POST",
		body: req,
		json: true
	});

	console.log("OnionRouteQuest: sent first request");
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
