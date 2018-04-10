import http from "http"
import express from "express"
import bodyParser from "body-parser"
import { Block, BlockContent } from "./Blockchain"
import BlockchainVerifier from "./BlockchainVerifier"
import BlockchainTree from "./BlockTree"
import PeerSet, {Peer} from "./PeerSet"




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
class BlockChainServer {
  // private blockChain: Array<Block<BlockContent>>;
  private blockTree: BlockchainTree;
  private verifier: BlockchainVerifier;
  private peers: PeerSet;

  server: http.Server;

  /**
   * Create a new blockchain Server.
   */
  constructor() {
    this.blockTree = new BlockchainTree();
    this.verifier = new BlockchainVerifier();
    this.peers = new PeerSet();

    const app = express();
    app.use(bodyParser.json());

    // Post a new block to this server
    app.post('/block', (req, res) => {
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
  }

  /**
   * Adds a block to the blockchain.
   *
   * This method verifies the newly given node with the BlockChainVerifier
   *
   * @param {Block<BlockContent>} block : New Block to add
   * @returns {Boolean} true if the block was successfully added, false on verification error.
   */
  private addBlock(block: Block<BlockContent>) {
    // console.log("New Block\n " + JSON.stringify(block));

    try {
      this.verifier.verify(this.blockTree, block);
      this.blockTree.addBlock(block);
    } catch (err) {
      console.log("BlockChain Verify failed");
      console.log(err);
      return false;
    }
    this.blockTree.displayNicely();
    return true;
  }
}

/**
 * Returns an httpServer for the blockchainServer.
 * @returns {http.Server} Blockchain Server
 */
export default function createBlockChainServer() {
  const blockChainServer = new BlockChainServer();
  return blockChainServer.server;
}
