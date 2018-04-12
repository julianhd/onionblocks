import http from "http"
import express from "express"
import bodyParser from "body-parser"
import { Block, BlockContent } from "./Blockchain"
import BlockchainVerifier, { MissingBlockError } from "./BlockchainVerifier"
import BlockchainTree from "./BlockTree"
import PeerSet, { Peer } from "./PeerSet"
import got from "got"


/**
 * Represents a Blockchain Server
 *
 * This server listens for
 *    POST request of new block at the address /block with a JSON payload
 *    GET request for the blockchain, parameter since=<number>
 *        Returns an array of the blockchain from since+1 (exclusive) as JSON
 *
 * The server uses the express module with the JSON bodyParser middleware
 */
export default class BlockChainServer {
  // private blockChain: Array<Block<BlockContent>>;
  private blockTree: BlockchainTree;
  private verifier: BlockchainVerifier;
  private peers: PeerSet;
  private holdBackQueue: Array<Block<BlockContent>>;
  private inRecovery: Boolean;
  private thisPeer: Peer;

  private RECOVERY_PEER_COUNT: number = 3;
  private PEER_FETCH_COUNT: number = 3;
  private DEFAULT_TTL: number = 600000; // 10 minutes

  server: http.Server;

  /**
   * Create a new blockchain Server.
   *
   * @param {number} updateInterval : Interval in MS to find new peers
   * @param {string} host : This server host Address
   * @param {number} port : This server port
   */
  constructor(blockTree: BlockchainTree, updateInterval: number, host: string, port: number) {
    this.blockTree = blockTree;
    this.verifier = new BlockchainVerifier();
    this.peers = new PeerSet();
    this.thisPeer = {
      address: host,
      port: port,
      ttl: this.DEFAULT_TTL,
      isMaster: false
    };
    this.holdBackQueue = [];
    this.inRecovery = false;

    this.blockTree.listen(this.broadcastBlock.bind(this));

    const app = express();
    app.use(bodyParser.json());

    // Post a new block to this server
    app.post('/block', async (req, res) => {
      // console.log("BlockchainServer: request post " + JSON.stringify(req.body));
      var status;
      if (!req.body || !this.addBlock(req.body)) {
        status = 400;
      }
      else {
        status = 200;
      }
      return res.status(status).json({});
    });

    // Retrieve the blockchain partially or fully
    app.get('/blockchain', (req, res) => {
      // console.log(req.query);
      var since = req.query.since;
      if (!since) {
        res.json(this.blockTree.getStruct());
      }
      else {
        res.json(this.blockTree.getChainSince(since));
      }
    });

    // Returns a list of peers as Array<Peer> parameter count=<count>
    // Returns as an object { "peers" : Array<Peer> }
    app.get('/list', (req, res) => {
      let count = Number.parseInt(req.query.count);
      if (Number.isInteger(count)) {
        res.json({ peers: this.peers.getRandomPeerList(count)});
      }
      else {
        res.status(400).json({});
      }
    });

    // Register as a peer:
    // Body must be a  Peer { address: string, port: number, ttl: number}
    app.post('/register', (req, res) => {
      if (!req.body || !this.peers.addPeer(req.body)) {
        return res.status(400).json({});
      }
      else {
        return res.json({});
      }
    });

    this.server = http.createServer(app);

    setInterval(async () => {
      this.syncPeers();
    }, updateInterval);
  }

  /**
   * Adds a block to the blockchain.
   *import got from "got"
   * This method verifies the newly given node with the BlockChainVerifier
   *
   * @param {Block<BlockContent>} block : New Block to add
   * @returns {Boolean} true if the block was successfully added, false on verification error.
   */
  private addBlock(block: Block<BlockContent>) {
    // console.log("New Block\n " + JSON.stringify(block));

    // Put the block in holdBackQueue if we're currently recovering from failure.
    // It will be processed later by the recovery mechanism
    if (this.inRecovery) {
      this.holdBackQueue.push(block);
    }
    else {
      try {
        this.verifier.verify(this.blockTree, block);
      } catch(err) {
        if (err instanceof MissingBlockError) {
          // this.recoverChain(block);
          console.log('MissingBlockError ' + JSON.stringify(err));
        }
        else {
          console.log("BlockChain Verify failed");
          console.log(err);
          return false;
        }
      }
      this.blockTree.addBlock(block);
    }

    this.blockTree.displayNicely();
    return true;
  }

  private recoverChain(fromBlock?: Block<BlockContent>) {
    this.inRecovery = true;
    let recoveryPeer = this.peers.getRandomPeerList(this.RECOVERY_PEER_COUNT);
    // TODO ask for the chain from these until we get the full list
    // TODO maybe simplify and just get the complete list from one
    // TODO Check the hold back queue
  }

  private async syncPeers() {
    console.log('BlockChainServer: Syncing peers');
    let updatePeerList = this.peers.getRandomPeerList(this.PEER_FETCH_COUNT);
    console.log('BlockChainServer: Peer list\n' + JSON.stringify(updatePeerList));
    for (let i = 0; i < updatePeerList.length; i++) {
      let peer = updatePeerList[i];
      try {
        // Register yourself with that peer
        await got(`http://${peer.address}:${peer.port}/register`, {
      		method: "POST",
      		body: this.thisPeer,
      		json: true
      	});

        // Get that peer list
        let response = await got(`http://${peer.address}:${peer.port}/list?count=${this.PEER_FETCH_COUNT}`);
        console.log(`BlockChainServer: syncPeers response: ${response.body}`);
        let newPeerList = JSON.parse(response.body);
        if (newPeerList.peers) {
          for (let j = 0; j < newPeerList.peers.length; j++) {
            this.peers.addPeer(newPeerList.peers[j]);
          }
        }
      } catch (err) {
        // TODO maybe add a retry and kill the peer if still dead or if there's more time an exponential backoff
        console.log('BlockChainServer: Error syncing peer with ' + JSON.stringify(peer) + '\nErr: ' + JSON.stringify(err));
      }
    }
  }

  /**
   * Adds a master (Always alive) to the peer list.
   *
   * @param {string} host : Address of the peer
   * @param {number} port : Port of the peer
   * @returns {Void}
   */
  addMasterPeer(host: string, port: number) {
    this.peers.addPeer({
      address: host,
      port: port,
      isMaster : true,
      ttl : 0
    });
  }

  async broadcastBlock(block: Block<BlockContent>) {
    console.log('BlockChainServer: Broadcasting new block');
    let allPeers = this.peers.getAllPeers();
    for (let i = 0; i < allPeers.length; i++) {
      let peer = allPeers[i];
      try {
        // Register yourself with that peer
        await got(`http://${peer.address}:${peer.port}/block`, {
      		method: "POST",
      		body: block,
      		json: true
      	});
      } catch (err) {
        // Disregard errors, their bad!!
        console.log('BlockChainServer: Error broadcasting block,\nPeer: ' + JSON.stringify(peer) + '\nErr: ' + JSON.stringify(err));
      }
    }
  }
}
