import http from "http"
import express from "express"
import bodyParser from "body-parser"
import fs from "fs"
import NodeRSA from "node-rsa"
import os from "os"
import got from "got"

import Blockchain, { OnionNode, BlockContent, Entity } from "./Blockchain"
import { Request, Relay, Exit } from "./request"
import onionRouteRequest from "./onionRouteRequest"
import Miner from "./Miner"

/**
The PeerNode Server,
This server relays messages from one Node to another
While progressively decrypting the message
*/
class PeerNodeServer {
	public readonly server: http.Server
	private rsa: NodeRSA;

	constructor(private serverPort: number) {
		this.init()

		const app = express()
		app.use(bodyParser.json());

		// Handle POST requests
		app.post("/request", async (req, res) => {
			try {
				const requestMessage: Request = req.body;
				const decryptedMessage: Relay | Exit<any> = this.rsa.decrypt(
					requestMessage.encrypted,
					"json",
				)
				console.log("PeerNodeServer: post decryptedMessage -- " + JSON.stringify(decryptedMessage));

				if (decryptedMessage.type == "relay") {
					// ------ TO BE TESTED --------
					const nextRequest: Request = {
						encrypted: decryptedMessage.encrypted,
					}

					await got(`http://${decryptedMessage.next}/request`, {
						method: "POST",
						json: true,
						body: req,
					})

				} else if (decryptedMessage.type == "exit") {
					const miner = new Miner()
					const block = await miner.mine(decryptedMessage.content)
					const blockchain = new Blockchain(null)
					await blockchain.post(block)
				}
				res.end()
			} catch (error) {
				res.status(500).end()
				throw error
			}
		})

		this.server = http.createServer(app)
	}

	init() {
		this.rsa = new NodeRSA();
		var fileName = "./data/onion" + this.serverPort + ".json"

		var exists = fs.existsSync(fileName);

		if (exists) {
			console.log("JSON exists, loading " + fileName)
			//Load RSA files
			const str = fs.readFileSync(fileName, "utf8")
			const keys = JSON.parse(str)

			this.rsa.importKey(keys["public"], "pkcs8-public")
			this.rsa.importKey(keys["private"], "pkcs8-private")

			console.log("Keys loaded.")
		} else {
			console.log("Generating keys...")

			// Generate RSA key pair.
			this.rsa.generateKeyPair(512);
			var publicKey = this.rsa.exportKey("pkcs8-public") //export public key
			var privateKey = this.rsa.exportKey("pkcs8-private") //export private key
			console.log("Generated key pair")
			console.log("----------------------------")

			const keys = { public: publicKey, private: privateKey }
			var jsonString = JSON.stringify(keys)

			//Create RSA key JSON file
			fs.writeFileSync(fileName, jsonString)
		}

		this.timerRun()

		setInterval(this.timerRun, 30000)
	}


	timerRun = async () => {
			console.log("port " + this.serverPort);
		// console.log("Created Entity")
		const node: OnionNode = {
			type: "node",
			timestamp: Date.now(),
			host: os.hostname(),
			port: this.serverPort,
			public: this.rsa.exportKey("pkcs8-public"),
		}

		const nodeString = JSON.stringify(node)
		// console.log(nodeString)
		const nodeBuffer = Buffer.from(nodeString)

		const entity: Entity<OnionNode> = {
			content: node,
			signature: this.rsa.sign(nodeBuffer).toString("hex"),
		}

		const miner = new Miner()
		const block = await miner.mine(entity)
		const blockchain = new Blockchain(null)
		try {
			await blockchain.post(block)
		} catch (err) {
			console.log("PeerNodeServer: Unable to post the block -- " + JSON.stringify(err));
		}
	}
}

/**
 * Returns an HTTP server that handles relaying encrypted messages
 */
export default function createPeerNodeServer(serverPort: number) {
	const node = new PeerNodeServer(serverPort)
	return node.server
}
