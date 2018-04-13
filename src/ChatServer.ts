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
import url from "url"
import { DecryptedRequest } from "./request"

interface ServerUser extends User {
	private: string
	password: string
}

export class ChatServer {
	private chatHistory: Array<BlockData<Chat>> = []

	private blockHistory: Array<Block<BlockContent>> = []

	private requestHistory: Array<DecryptedRequest> = []

	public readonly server: http.Server

	private chatSockets = new Set<WebSocket>()

	private blockSockets = new Set<WebSocket>()

	private requestSockets = new Set<WebSocket>()

	constructor(private blockchain: Blockchain) {
		blockchain.listenBlocks(block => {
			const { data } = block
			this.blockHistory.push(block)
			this.broadcastBlock(block)
			if (data.content.type === "chat") {
				this.chatHistory.push(data as BlockData<Chat>)
				this.broadcastChat(data as BlockData<Chat>)
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

		const chatWebSocketServer = new WebSocket.Server({ noServer: true })
		chatWebSocketServer.on("connection", (ws, req) => {
			console.log("User connected")
			this.chatSockets.add(ws)
			this.sendChatHistory(ws)
			ws.on("close", () => {
				console.log("User disconnected")
				this.chatSockets.delete(ws)
			})
			ws.on("error", error => {
				console.log(error)
			})
		})

		const blockWebSocketServer = new WebSocket.Server({ noServer: true })
		blockWebSocketServer.on("connection", (ws, req) => {
			this.blockSockets.add(ws)
			this.sendBlockHistory(ws)
			ws.on("close", () => {
				this.blockSockets.delete(ws)
			})
			ws.on("error", error => {
				console.log(error)
			})
		})

		const requestWebSocketServer = new WebSocket.Server({ noServer: true })
		requestWebSocketServer.on("connection", (ws, req) => {
			this.requestSockets.add(ws)
			this.sendRequestHistory(ws)
			ws.on("close", () => {
				this.requestSockets.delete(ws)
			})
			ws.on("error", error => {
				console.log(error)
			})
		})

		this.server.on("upgrade", (request, socket, head) => {
			const pathname = url.parse(request.url).pathname
			if (pathname === "/api/messages") {
				chatWebSocketServer.handleUpgrade(request, socket, head, ws =>
					chatWebSocketServer.emit("connection", ws),
				)
			} else if (pathname === "/api/blocks") {
				blockWebSocketServer.handleUpgrade(request, socket, head, ws =>
					blockWebSocketServer.emit("connection", ws),
				)
			} else if (pathname === "/api/requests") {
				requestWebSocketServer.handleUpgrade(request, socket, head, ws =>
					requestWebSocketServer.emit("connection", ws),
				)
			} else {
				socket.destroy()
			}
		})
	}

	public pushRequest(request: DecryptedRequest) {
		this.requestHistory.push(request)
		this.broadcastRequest(request)
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
		for (const websocket of this.chatSockets) {
			const data = JSON.stringify(object)
			websocket.send(data)
		}
	}

	/**
	 * Sends all the chat history on the blockchain to the given client socket.
	 *
	 * @param websocket websocket
	 */
	private sendChatHistory(websocket: WebSocket) {
		for (const block of this.chatHistory) {
			const object = Object.assign(
				{ hash: keyShortHash(block.public) },
				block.content,
			)
			const data = JSON.stringify(object)
			websocket.send(data)
		}
	}

	private broadcastBlock(block: Block<BlockContent>) {
		for (const websocket of this.blockSockets) {
			const data = JSON.stringify(block)
			websocket.send(data)
		}
	}

	private sendBlockHistory(websocket: WebSocket) {
		if (this.blockHistory.length > 50) {
			for (
				let i = this.blockHistory.length - 50;
				i < this.blockHistory.length;
				i++
			) {
				const block = this.blockHistory[i]
				const data = JSON.stringify(block)
				websocket.send(data)
			}
		} else {
			for (const block of this.blockHistory) {
				const data = JSON.stringify(block)
				websocket.send(data)
			}
		}
	}

	private broadcastRequest(request: DecryptedRequest) {
		for (const websocket of this.requestSockets) {
			const data = JSON.stringify(request)
			websocket.send(data)
		}
	}

	private sendRequestHistory(websocket: WebSocket) {
		if (this.blockHistory.length > 50) {
			for (
				let i = this.requestHistory.length - 50;
				i < this.requestHistory.length;
				i++
			) {
				const request = this.requestHistory[i]
				const data = JSON.stringify(request)
				websocket.send(data)
			}
		} else {
			for (const request of this.requestHistory) {
				const data = JSON.stringify(request)
				websocket.send(data)
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
		var bcrypt = require("bcrypt-nodejs")

		var salt = bcrypt.genSaltSync()
		var hashedPw = bcrypt.hashSync(pw, salt)

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
	return chat
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
