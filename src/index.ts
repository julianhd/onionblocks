import createStaticServer from "./createStaticServer"
import createChatServer from "./ChatServer"

const staticServer = createStaticServer()
staticServer.listen(8080, "127.0.0.1")
console.log("Server running at http://127.0.0.1:8080")

const chatServer = createChatServer()
chatServer.listen(8081, "127.0.0.1")
//console.log("Chat server running at http://127.0.0.1:8081")
