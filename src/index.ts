import createStaticServer from "./createStaticServer"
import createChatServer from "./ChatServer"
import createBlockChainServer from "./BlockChainServer"
import createPeerNodeServer from "./PeerNodeServer"

const NODE_COUNT = 3
const NODE_SERVER_RANGE = 8100

const staticServer = createStaticServer()
staticServer.listen(8080, "127.0.0.1")
console.log("Server running at http://127.0.0.1:8080")

const chatServer = createChatServer()
chatServer.listen(8081, "127.0.0.1")

const blockchainServer = createBlockChainServer()
blockchainServer.listen(8082, "127.0.0.1")

for (let i = 0; i < NODE_COUNT; i++) {
	const port = NODE_SERVER_RANGE + i;

	// This is to not start them all so close that they always collide when mining a new block
	(function (port) {
		setTimeout(function () {
			const nodeServer = createPeerNodeServer(port)
			nodeServer.listen(port, "127.0.0.1")
		}, Math.floor(Math.random() * 100));
	})(port);



}

//console.log("Chat server running at http://127.0.0.1:8081")
