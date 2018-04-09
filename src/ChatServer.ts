import http from "http"
import express from "express"
import WebSocket from "ws"
import Blockchain, {
	Chat,
	Block,
	BlockContent,
	Entity,
	User,
} from "./Blockchain"
import cors from "cors"

/**
 * Dummy onion request function.
 *
 * @param entity
 */
function OnionRoutingRequest(entity: Entity) {
	console.log(entity)
}

interface ServerUser extends User {
	private: string
	password: string
}

class ChatServer {
	public readonly server: http.Server
	private user: ServerUser | null
	
	private salt: string | null
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

		const bodyParser = require('body-parser');
		app.use(bodyParser.urlencoded({extended: true}))
		
		app.post("/register", async (req, res) => {
			const name = req.query.name
			const pw = req.query.pw
			console.log(`User '${name}' registering`)
			console.log(`with password '${pw}'`)
			try {
				await this.register(name, pw)
				res.end()
			} catch (error) {
				res.status(401).end()
				throw error
			}
		})
		app.post("/login", async (req, res) => {
			const name = req.query.name
			const pw = req.query.pw
			console.log(`User '${name}' logging in`)
			console.log(`with password '${pw}'`)
			try {
				await this.login(name, pw)
				res.end()
			} catch (error) {
				res.status(401).end()
				throw error
			}
		})
		app.post("/chat", async (req, res) => {
			const { message } = req.query
			console.log(`User sent message '${message}'`)
			try {
				await this.sendChat(message)
				res.end()
			} catch (error) {
				res.status(401).end()
				throw error
			}
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
		this.salt = null
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
	 * @param pw password
	 */
	async register(name: string, pw: string) {
		var bcrypt = require('bcrypt-nodejs')

		this.salt = bcrypt.genSaltSync()
		var hashedPw = bcrypt.hashSync(pw, this.salt)

		var rsa = require("node-rsa")
		var keys = new rsa({ b: 256 })

		keys.generateKeyPair()

		var privateKey = keys.exportKey("pkcs8-private")
		var publicKey = keys.exportKey("pkcs8-public")

		// Save to a file
		var fileSystem = require("fs")
		var filePath = "./data/" + name + ".json"

		let userInfo = {
			private: privateKey,
			public: publicKey,
		}

		var user: User = {
			type: "user",
			timestamp: Date.now(),
			name: name,
			public: publicKey,
		}

		var serverUser: ServerUser = {
			type: "user",
			timestamp: Date.now(),
			name: name,
			password: hashedPw,
			private: privateKey,
			public: publicKey,
		}

		var data = JSON.stringify(serverUser, null, 2)
		fileSystem.writeFileSync(filePath, data)

		this.user = serverUser

		var userString = JSON.stringify(user)
		var userBuffer = Buffer.from(userString)

		var entity: Entity = {
			object: user,
			signature: keys.sign(userBuffer).toString("hex"),
		}

		// TODO: Call the real OnionRoutingRequest
		OnionRoutingRequest(entity)
	}

	/**
	 * Loads the RSA key for the given username.
	 *
	 * @param name username
	 * @param pw password
	 */
	async login(name: string, pw: string) {
		var fileSystem = require("fs")
		var filePath = "./data/" + name + ".json"

		let rawData = fileSystem.readFileSync(filePath, {encoding: "utf8"})
		var obj = JSON.parse(rawData)
		var hashedPw = obj.password
		console.log(hashedPw)

		var bcrypt = require('bcrypt-nodejs')
		console.log(pw + " " + hashedPw)

		var samePw = bcrypt.compareSync(pw, hashedPw)
		if (samePw) {
			this.user = JSON.parse(rawData)
			console.log(this.user)
		}
		else {
			throw new Error("Invalid password")
		}
		
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
				message: message,
			}

			var rsa = require("node-rsa")
			var key = new rsa(this.user.private)

			var chatString = JSON.stringify(chat)
			var chatBuffer = Buffer.from(chatString)

			var entity: Entity = {
				object: chat,
				signature: key.sign(chatBuffer).toString("hex"),
			}

			// TODO: Remove this temporary hack
			this.broadcastChat(chat)

			// TODO: Call the real OnionRoutingRequest
			OnionRoutingRequest(entity)
		} else {
			throw new Error("Username is invalid")
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
