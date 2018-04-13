import http from "http"
import express from "express"
import bodyParser from "body-parser"
import fs from "fs"
import NodeRSA from "node-rsa"
import os from "os"
import got from "got"

import Blockchain, { OnionNode, BlockContent, Entity } from "./Blockchain"
import { Request, Relay, Exit, DecryptedRequest } from "./request"
import Miner from "./Miner"
import { ChatServer } from "./ChatServer"

const { ONIONBLOCKS_PEER_NODE_HOSTNAME } = process.env

/**
The PeerNode Server,
This server relays messages from one Node to another
While progressively decrypting the message
*/
class PeerNodeServer {
	public readonly server: http.Server
	private rsa: NodeRSA

	constructor(
		private serverPort: number,
		private blockchain: Blockchain,
		private chatServer?: ChatServer,
	) {
		this.rsa = new NodeRSA()
		this.init()

		const app = express()
		app.use(bodyParser.json())

		// Handle POST requests
		app.post("/request", async (req, res) => {
			try {
				const requestMessage: Request = req.body
				const decryptedMessage: DecryptedRequest = this.rsa.decrypt(
					requestMessage.encrypted,
					"json",
				)
				console.log("PeerNodeServer: post decryptedMessage")

				if (this.chatServer != null) {
					this.chatServer.pushRequest(decryptedMessage)
				}

				if (decryptedMessage.type == "relay") {
					// ------ TO BE TESTED --------
					const nextRequest: Request = {
						encrypted: decryptedMessage.encrypted,
					}

					await got(`http://${decryptedMessage.next}/request`, {
						method: "POST",
						json: true,
						body: nextRequest,
					})
				} else if (decryptedMessage.type == "exit") {
					const miner = new Miner(blockchain)
					const block = await miner.mine(decryptedMessage.content)
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
		var fileName = "./data/onion" + this.serverPort + ".json"

		var exists = fs.existsSync(fileName)

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
			this.rsa.generateKeyPair(512)
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
		console.log("port " + this.serverPort)
		// console.log("Created Entity")

		const publicKey = this.rsa.exportKey("pkcs8-public")
		const node: OnionNode = {
			type: "node",
			timestamp: Date.now(),
			host: ONIONBLOCKS_PEER_NODE_HOSTNAME || os.hostname(),
			port: this.serverPort,
			public: publicKey,
		}

		const nodeString = JSON.stringify(node)
		// console.log(nodeString)
		const nodeBuffer = Buffer.from(nodeString)

		const entity: Entity<OnionNode> = {
			content: node,
			signature: this.rsa.sign(nodeBuffer).toString("hex"),
			public: publicKey,
		}

		const miner = new Miner(this.blockchain)
		const block = await miner.mine(entity)
		try {
			await this.blockchain.post(block)
		} catch (err) {
			console.log(
				"PeerNodeServer: Unable to post the block -- " + JSON.stringify(err),
			)
		}
	}
}

/**
 * Returns an HTTP server that handles relaying encrypted messages
 */
export default function createPeerNodeServer(
	serverPort: number,
	blockchain: Blockchain,
	chatServer?: ChatServer,
) {
	const node = new PeerNodeServer(serverPort, blockchain, chatServer)
	return node.server
}
