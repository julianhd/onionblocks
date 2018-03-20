import http from "http"
import express from "express"
import WebSocket from "ws"
import Blockchain, { Chat, Block, BlockContent } from "./Blockchain"
import cors from "cors"

class ChatServer {
	public readonly server: http.Server

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
		})
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
		// TODO: Implement Initialize
	}

	/**
	 * Loads the RSA key for the given username.
	 *
	 * @param name username
	 */
	async login(name: string) {
		// TODO: Load the user's RSA key for use in `sendChat`
	}

	/**
	 * Adds a chat message to the blockchain using onion routing.
	 *
	 * @param message chat message
	 */
	async sendChat(message: string) {
		// TODO: Implement Handle POST /message
	}
}

/**
 * Returns an HTTP server that handles sending and receiving chat messages.
 */
export default function createChatServer() {
	const chat = new ChatServer()
	return chat.server
}

/**
 * Initializes a user's variables in the chat server.
 */
function init() {
	loadRSA()
	createUserEntity()
}

/**
 * Loads the private and public key pair for a user.
 */
function loadRSA() {
	try {
		var user = require("./data/user.json")

		// Check if a private key does not exist
		if (!user.hasOwnProperty("private")) {
			// Generate new key pair
			var rsa = require("node-rsa")
			var keys = new rsa({ b: 256 })

			keys.generateKeyPair()

			var privateKey = keys.exportKey("pkcs8-private")
			var publicKey = keys.exportKey("pkcs8-public")

			// Prompt user for their name
			var name = prompt("Enter your name: ")

			// Save all new information into ./data.user.json
			var newUser = { private: privateKey, public: publicKey, name: name }
			var userString = JSON.stringify(newUser)

			user.writeFile("./data/user.json", userString, function(err: Error) {
				if (err) {
					return console.error(err)
				}
				console.log("Saved new user information into './data/user/json'.")
			})
		}

		var privateKey = user.private
		var publicKey = user.public
		var username = user.name
	} catch (e) {
		console.log("Error in loading user information...")
	}
}

/**
 * Creates an Entity that is of type User with their name and public key.
 */
function createUserEntity() {
	// ...
}
