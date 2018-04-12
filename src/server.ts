import createChatServer from "./ChatServer"
import createPeerNodeServer from "./PeerNodeServer"
import BlockChainServer from "./BlockChainServer"
import Blockchain from "./Blockchain"
import BlockTree from "./BlockTree"
import os from "os"
import dns from "dns"

const PEER_UPDATE_MS = 30000
const MASTER_PORT = 8082
const { MASTER_HOST = "10.162.0.2" } = process.env

const blocktree = new BlockTree();
const blockchain = new Blockchain(null, blocktree);

const chatServer = createChatServer(blockchain)
chatServer.listen(80)

dns.lookup(os.hostname(), (err, address, family) => {
	if (err) {
		throw err
	}

	const blockchainServer = new BlockChainServer(blocktree, PEER_UPDATE_MS, address, 8082)
	blockchainServer.addMasterPeer(MASTER_HOST, MASTER_PORT) // TODO some kind of cmd line args to set no master
	blockchainServer.server.listen(8082)
})

const nodeServer = createPeerNodeServer(8100, blockchain)
nodeServer.listen(8100)

//console.log("Chat server running at http://127.0.0.1:8081")
