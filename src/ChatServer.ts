import http from "http"
import express from "express"
import WebSocket from "ws"
import Blockchain, {
	Chat,
	Block,
	BlockContent,
	Entity,
	User,
	BlockData,
} from "./Blockchain"
import onionRouteRequest from "./onionRouteRequest"
import serveStatic from "serve-static"
import bodyParser from "body-parser"
import crypto from "crypto"

interface ServerUser extends User {
	private: string
	password: string
}

class ChatServer {
	private chatHistory: Array<BlockData<Chat>> = []
	public readonly server: http.Server

	private salt: string | null
	private websockets = new Set<WebSocket>()

	constructor(private blockchain: Blockchain) {
		blockchain.listenBlocks(block => {
			const { data } = block
			if (data.content.type === "chat") {
				this.broadcastChat(data as BlockData<Chat>)
				this.chatHistory.push(data as BlockData<Chat>)
				console.log("in the blockchain " + this.chatHistory.length)
			}
		})

		const app = express()
		app.use(bodyParser.urlencoded({ extended: true }))
		app.use(serveStatic("./public"))

		app.get("/api/ping", (req, res) => {
			res.end("pong")
		})
		app.post("/api/register", async (req, res) => {
			const name = req.query.name
			const pw = req.query.pw
			console.log(`User '${name}' registering`)
			try {
				await this.register(name, pw)
				res.end()
			} catch (error) {
				res.status(401).end()
				throw error
			}
		})
		app.post("/api/login", async (req, res) => {
			const name = req.query.name
			const pw = req.query.pw
			console.log(`User '${name}' logging in`)
			try {
				await this.validateUser(name, pw)
				res.end()
			} catch (error) {
				res.status(401).end()
				throw error
			}
		})
		app.post("/api/chat", async (req, res) => {
			const message = req.query.message
			const name = req.query.name
			const pw = req.query.pw
			// console.log(`User sent message '${message}'`)
			try {
				var user = await this.validateUser(name, pw)
				await this.sendChat(message, user)
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
		this.salt = null
	}

	/**
	 * Sends the chat message to all connected clients.
	 *
	 * @param chat chat entity
	 */
	private broadcastChat(block: BlockData<Chat>) {
		const object = Object.assign(
			{ hash: keyShortHash(block.public) },
			block.content,
		)
		for (const websocket of this.websockets) {
			const data = JSON.stringify(object)
			websocket.send(data)
		}
	}

	/**
	 * Sends all the chat history on the blockchain to the given client socket.
	 *
	 * @param websocket websocket
	 */
	private async sendChatHistory(websocket: WebSocket) {
		for (const block of this.chatHistory) {
			const object = Object.assign(
				{ hash: keyShortHash(block.public) },
				block.content,
			)
			const data = JSON.stringify(object)
			websocket.send(data)
		}
	}

	/**
	 * Creates a new RSA key and adds the user to the blockchain using onion routing.
	 *
	 * @param name username
	 * @param pw password
	 */
	async register(name: string, pw: string) {
		var bcrypt = require("bcrypt-nodejs")

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

		var userString = JSON.stringify(user)
		var userBuffer = Buffer.from(userString)

		var entity: Entity<User> = {
			content: user,
			signature: keys.sign(userBuffer).toString("hex"),
			public: publicKey,
		}
		await onionRouteRequest(entity, this.blockchain)
	}

	/**
	 * Validates the user.
	 *
	 * @param name username
	 * @param pw password
	 */
	async validateUser(name: string, pw: string) {
		var fileSystem = require("fs")
		var filePath = "./data/" + name + ".json"

		let rawData = fileSystem.readFileSync(filePath, { encoding: "utf8" })
		var obj = JSON.parse(rawData)
		var hashedPw = obj.password

		var bcrypt = require("bcrypt-nodejs")

		var samePw = bcrypt.compareSync(pw, hashedPw)
		if (samePw) {
			console.log("Sign in successful")
			return obj as ServerUser
		} else {
			throw new Error("Invalid password")
		}
	}

	/**
	 * Adds a chat message to the blockchain using onion routing.
	 *
	 * @param message chat message
	 * @param user server user
	 */
	async sendChat(message: string, user: ServerUser) {
		if (user != null) {
			var chat: Chat = {
				type: "chat",
				timestamp: Date.now(),
				from: user.name,
				message: message,
			}

			var rsa = require("node-rsa")
			var key = new rsa(user.private, "pkcs8-private")
			var chatString = JSON.stringify(chat)
			var chatBuffer = Buffer.from(chatString)

			var entity: Entity<Chat> = {
				content: chat,
				signature: key.sign(chatBuffer, "base64"),
				public: user.public,
			}

			await onionRouteRequest(entity, this.blockchain)
		} else {
			throw new Error("Username is invalid")
		}
	}
}

/**
 * Returns an HTTP server that handles sending and receiving chat messages.
 */
export default function createChatServer(blockChain: Blockchain) {
	const chat = new ChatServer(blockChain)
	return chat.server
}

// Check for hash collisions
const keyHashes = new Map<string, string>()

function keyShortHash(key: string) {
	const hash = crypto.createHash("sha256")
	hash.update(key)
	const long = hash.digest("hex")
	const short = long.substr(0, 6)

	if (keyHashes.has(long)) {
		if (keyHashes.get(long) != short) {
			throw new Error("Hash collision!")
		}
	} else {
		keyHashes.set(long, short)
	}

	return short
}
