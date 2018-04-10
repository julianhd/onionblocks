import createStaticServer from "./createStaticServer"
import createChatServer from "./ChatServer"
import createPeerNodeServer from "./PeerNodeServer"
import BlockChainServer from "./BlockChainServer"
import os from "os"
import dns from "dns"

const PEER_UPDATE_MS = 30000
const MASTER_PORT = 8082
const { MASTER_HOST = "172.17.0.2" } = process.env

const staticServer = createStaticServer()
staticServer.listen(8080)

const chatServer = createChatServer()
chatServer.listen(8081)

dns.lookup(os.hostname(), (err, address, family) => {
	if (err) {
		throw err
	}

	const blockchainServer = new BlockChainServer(PEER_UPDATE_MS, address, 8082)
	blockchainServer.addMasterPeer(MASTER_HOST, MASTER_PORT) // TODO some kind of cmd line args to set no master
	blockchainServer.server.listen(8082)
	console.log(">>> BLOCKCHAIN READY")
})

const nodeServer = createPeerNodeServer(8100)
nodeServer.listen(8100)

//console.log("Chat server running at http://127.0.0.1:8081")
