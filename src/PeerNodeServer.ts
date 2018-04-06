import http from "http"
import express from "express"
import fs from "fs"
import NodeRSA from "node-rsa"
import cors from "cors"
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
	rsa: NodeRSA = new NodeRSA({ b: 256 })

	constructor(private serverPort: number) {
		this.init()

		const app = express()
		app.use(cors)

		// Handle POST requests
		app.post("/request", async (req, res) => {
			try {
				const requestMessage: Request = JSON.parse(req.body)
				const decryptedMessage: Relay | Exit<any> = this.rsa.decrypt(
					requestMessage.encrypted,
					"json",
				)

				if (decryptedMessage.type == "relay") {
					// ------ TO BE TESTED --------
					const nextRequest: Request = {
						encrypted: decryptedMessage.encrypted,
					}
					const data = JSON.stringify(req)

					await got(`http://${decryptedMessage.next}/request`, {
						method: "POST",
						body: data,
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
		var fileName = "onion" + this.serverPort + ".json"
		fs.exists(fileName, exists => {
			if (exists) {
				console.log("JSON exists, loading keys...")
				//Load RSA files
				const keys = JSON.parse(fs.readFileSync(fileName, "utf8"))

				this.rsa.importKey(keys["public"], "pkcs8-public")
				this.rsa.importKey(keys["private"], "pkcs8-private")

				console.log("Keys loaded.")
			} else {
				console.log("Generating keys...")

				// Generate RSA key pair.
				this.rsa.generateKeyPair()
				var publicKey = this.rsa.exportKey("pkcs8-public") //export public key
				var privateKey = this.rsa.exportKey("pkcs8-private") //export private key
				console.log("First key pair")
				console.log("----------------------------")

				const keys = { public: publicKey, private: privateKey }
				var jsonString = JSON.stringify(keys)

				//Create RSA key JSON file
				fs.writeFile(fileName, jsonString, function(err) {
					if (err) {
						return console.log(err)
					}

					console.log("Keys generated.")
				})
			}
		})

		setInterval(this.timerRun, 30000)
	}

	timerRun() {
		console.log("Created Entity")
		const node: OnionNode = {
			type: "node",
			timestamp: Date.now(),
			host: os.hostname(),
			public: this.rsa.exportKey("pkcs8-public"),
		}

		const nodeString = JSON.stringify(node)
		const nodeBuffer = Buffer.from(nodeString)

		const entity: Entity<OnionNode> = {
			content: node,
			signature: this.rsa.sign(nodeBuffer).toString("hex"),
		}

		onionRouteRequest(entity)
	}
}

/**
 * Returns an HTTP server that handles relaying encrypted messages
 */
export default function createPeerNodeServer(serverPort: number) {
	const node = new PeerNodeServer(serverPort)
	return node.server
}
