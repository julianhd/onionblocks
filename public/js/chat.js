const CHAT_SERVER_URL = window.location.host

window.chat = {
	async register(name, pw) {
		const encodedName = encodeURIComponent(name)
		const encodedPw = encodeURIComponent(pw)
		const res = await fetch(
			`http://${CHAT_SERVER_URL}/api/register?name=${encodedName}&pw=${encodedPw}`,
			{
				method: "POST",
			},
		)
		if (res.status === 401) {
			throw new Error("Unauthorized")
		}
		localStorage.setItem("name", name)
		localStorage.setItem("pw", pw)
	},
	async login(name, pw) {
		const encodedName = encodeURIComponent(name)
		const encodedPw = encodeURIComponent(pw)
		const res = await fetch(
			`http://${CHAT_SERVER_URL}/api/login?name=${encodedName}&pw=${encodedPw}`,
			{
				method: "POST",
			},
		)
		if (res.status === 401) {
			throw new Error("Unauthorized")
		}
		localStorage.setItem("name", name)
		localStorage.setItem("pw", pw)
	},
	async sendChat(message) {
		const encodedMessage = encodeURIComponent(message)
		const encodedName = encodeURIComponent(localStorage.getItem("name"))
		const encodedPw = encodeURIComponent(localStorage.getItem("pw"))
		const res = await fetch(
			`http://${CHAT_SERVER_URL}/api/chat?message=${encodedMessage}&name=${encodedName}&pw=${encodedPw}`,
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
