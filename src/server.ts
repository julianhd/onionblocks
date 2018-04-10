import createStaticServer from "./createStaticServer"
import createChatServer from "./ChatServer"
import createBlockChainServer from "./BlockChainServer"
import createPeerNodeServer from "./PeerNodeServer"

const staticServer = createStaticServer()
staticServer.listen(8080, "0.0.0.0")

const chatServer = createChatServer()
chatServer.listen(8081, "0.0.0.0")

const blockchainServer = createBlockChainServer()
blockchainServer.listen(8082, "0.0.0.0")

const nodeServer = createPeerNodeServer(8100)
nodeServer.listen(8100, "0.0.0.0")

console.log(">>> Listening")
