const CHAT_SERVER_URL = "localhost:8081"

window.chat = {
	async register(name) {
		const encoded = encodeURIComponent(name)
		const res = await fetch(
			`http://${CHAT_SERVER_URL}/register?name=${encoded}`,
			{
				method: "POST",
			},
		)
		if (res.status === 401) {
			throw new Error("Unauthorized")
		}
	},
	async login(name) {
		const encoded = encodeURIComponent(name)
		const res = await fetch(`http://${CHAT_SERVER_URL}/login?name=${encoded}`, {
			method: "POST",
		})
		if (res.status === 401) {
			throw new Error("Unauthorized")
		}
	},
	async sendChat(message) {
		const encoded = encodeURIComponent(message)
		const res = await fetch(
			`http://${CHAT_SERVER_URL}/chat?message=${encoded}`,
			{
				method: "POST",
			},
		)
		if (res.status === 401) {
			throw new Error("Unauthorized")
		}
	},
	onMessage(callback) {
		const websocket = new WebSocket(`ws://${CHAT_SERVER_URL}`)
		websocket.onopen = () => console.log("Connected to server")
		websocket.onclose = () => console.log("Disconnected from server")
		websocket.onmessage = event => {
			const data = JSON.parse(event.data)
			callback(data)
		}
	},
}

// // Usage example
// chat.login("thisguy")
// chat.sendChat("topkek")
// chat.onMessage(chat => {
// 	const pretty = JSON.stringify(chat, null, "\t")
// 	console.log(`Received chat ` + pretty)
// })
