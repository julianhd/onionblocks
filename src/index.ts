import createStaticServer from "./createStaticServer"
import createChatServer from "./ChatServer"
import createPeerNodeServer from "./PeerNodeServer"
import BlockChainServer from "./BlockChainServer"
import os from "os"
import dns from "dns"

const NODE_COUNT = 3
const NODE_SERVER_RANGE = 8100

const PEER_UPDATE_MS = 30000;
const MASTER_HOST = "172.17.0.2";
const MASTER_PORT = 8082;

const staticServer = createStaticServer()
staticServer.listen(8080)
console.log("Server running at http://127.0.0.1:8080")

const chatServer = createChatServer()
chatServer.listen(8081)

dns.lookup(os.hostname(), (err, address, family) => {
	if (err) { throw err }

	const blockchainServer = new BlockChainServer(PEER_UPDATE_MS, address, 8082);
	blockchainServer.addMasterPeer(MASTER_HOST, MASTER_PORT); // TODO some kind of cmd line args to set no master
	blockchainServer.server.listen(8082)

	for (let i = 0; i < NODE_COUNT; i++) {
		const port = NODE_SERVER_RANGE + i;

		// This is to not start them all so close that they always collide when mining a new block
		(function (port) {
		setTimeout(function () {
			const nodeServer = createPeerNodeServer(port)
			nodeServer.listen(port);
			console.log(`"PeerNode Listening at ${port}`)
		}, Math.floor(Math.random() * 1000));
	})(port);
}

});

//console.log("Chat server running at http://127.0.0.1:8081")
