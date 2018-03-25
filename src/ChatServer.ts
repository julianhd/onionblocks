import http from "http"
import express from "express"
import WebSocket from "ws"
import Blockchain, { Chat, Block, BlockContent, Entity, User } from "./Blockchain"
import cors from "cors"

/**
 * Dummy onion request function.
 * 
 * @param entity 
 */
function OnionRoutingRequest(entity: Entity) {
	console.log(entity);
}

interface ServerUser extends User {
	private: string
}

class ChatServer {
	public readonly server: http.Server
	private user: ServerUser | null

	private websockets = new Set<WebSocket>()

	private blockchain = new Blockchain(null, block => {
		const { data } = block
		if (data.content.type === "chat") {
			this.broadcastChat(data.content)
		}
	})

	constructor() {
		const app = express()
		app.use(cors())
		app.post("/register", async (req, res) => {
			const { name } = req.query
			console.log(`User '${name}' registering`)
			await this.register(name)
			res.end()
		})
		app.post("/login", async (req, res) => {
			const { name } = req.query
			console.log(`User '${name}' logging in`)
			await this.login(name)
			res.end()
		})
		app.post("/chat", async (req, res) => {
			const { message } = req.query
			console.log(`User sent message '${message}'`)
			await this.sendChat(message)
			res.end()
		})
		this.server = http.createServer(app)
		const wss = new WebSocket.Server({ server: this.server })
		wss.on("connection", (ws, req) => {
			console.log("User connected")
			this.websockets.add(ws)
			this.sendChatHistory(ws)
			ws.on("close", () => {
				console.log("User disconnected")
				this.websockets.delete(ws)
			})
			ws.on("error", error => {
				console.log(error)
			})
		})
		this.user = null
	}

	/**
	 * Sends the chat message to all connected clients.
	 *
	 * @param chat chat entity
	 */
	private broadcastChat(chat: Chat) {
		for (const websocket of this.websockets) {
			const data = JSON.stringify(chat)
			websocket.send(data)
		}
	}

	/**
	 * Sends all the chat history on the blockchain to the given client socket.
	 *
	 * @param websocket websocket
	 */
	private async sendChatHistory(websocket: WebSocket) {
		const blocks = await this.blockchain.get()
		for (const block of blocks) {
			const { data } = block
			if (data.content.type === "chat") {
				const string = JSON.stringify(data.content)
				websocket.send(string)
			}
		}
	}

	/**
	 * Creates a new RSA key and adds the user to the blockchain using onion routing.
	 *
	 * @param name username
	 */
	async register(name: string) {
		var rsa = require('node-rsa')
		var keys = new rsa({ b: 256 })

		keys.generateKeyPair()

		var privateKey = keys.exportKey("pkcs8-private")
		var publicKey = keys.exportKey("pkcs8-public")

		// Save to a file
		var fileSystem = require('fs')
		var filePath = "./data/" + name + ".json"

		let userInfo = {
			private: privateKey,
			public: publicKey
		}

		var user: User = {
			type: "user",
			timestamp: Date.now(),
			name: name,
			public: publicKey
		}

		var serverUser: ServerUser = {
			type: "user",
			timestamp: Date.now(),
			name: name,
			private: privateKey,
			public: publicKey
		}

		var data = JSON.stringify(serverUser, null, 2)
		fileSystem.writeFileSync(filePath, data)

		this.user = serverUser

		var userString = JSON.stringify(user)
		var userBuffer = Buffer.from(userString)

		var entity: Entity = {
			object: user,
			signature: keys.sign(userBuffer).toString("hex")
		}

		OnionRoutingRequest(entity)
	}

	/**
	 * Loads the RSA key for the given username.
	 *
	 * @param name username
	 */
	async login(name: string) {
		var fileSystem = require('fs');
		var filePath = "./data/" + name + ".json"

		let rawData = fileSystem.readFileSync(filePath)
		this.user = JSON.parse(rawData)
	}

	/**
	 * Adds a chat message to the blockchain using onion routing.
	 *
	 * @param message chat message
	 */
	async sendChat(message: string) {
		if (this.user != null) {
			var chat: Chat = {
				type: "chat",
				timestamp: Date.now(),
				from: this.user.name,
				message: message
			}

			var rsa = require('node-rsa')
			var key = new rsa(this.user.private)

			var chatString = JSON.stringify(chat)
			var chatBuffer = Buffer.from(chatString)

			var entity: Entity = {
				object: chat,
				signature: key.sign(chatBuffer).toString("hex")
			}

			OnionRoutingRequest(entity)
		}

		else {
			throw new Error('dafok u doin')
		}
	}
}

/**
 * Returns an HTTP server that handles sending and receiving chat messages.
 */
export default function createChatServer() {
	const chat = new ChatServer()
	return chat.server
}
