import http from "http"
import express from "express"
import bodyParser from "body-parser"
import { Block, BlockContent } from "./Blockchain"
import BlockChainVerifier from "./BlockchainVerifierDummy"


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
  private blockChain: Array<Block<BlockContent>>;

  server: http.Server;

  /**
   * Create a new blockchain Server.
   */
  constructor() {
    this.blockChain = [];

    const app = express();
    app.use(bodyParser.json());
    app.post('/block', (req, res) => {
      var status;
      if (!req.body || !this.addBlock(req.body)) {
        status = 400;
      } else {
        status = 200;
      }
      return res.sendStatus(status);
    });

    app.get('/blockchain', (req, res) => {
      console.log(req.query);
      var since = parseInt(req.query.since);
      if (!Number.isInteger(since)) {
        return res.sendStatus(400);
      } else {
        // get chain from since exclusive
        res.json(this.getBlockchain(since + 1));
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
    console.log("New Block\n " + JSON.stringify(block));

    try {
      var lastBlock = (this.blockChain.length > 0) ? this.blockChain[this.blockChain.length - 1] : null;
      BlockChainVerifier.verify(lastBlock, [block]);
    } catch (err) {
      console.log("BlockChain Verify failed");
      console.log(err);
      return false;
    }
    this.blockChain.push(block);
    console.log(this.blockChain);
    return true;
  }

  /**
   * Returns the blockchain as an array starting at index start (inclusive)
   *
   * @param {Number} start : First block to return in the blockChain
   * @returns {Array{Block}} Blockchain as an array from start
   */
  private getBlockchain(start : number) {
    return this.blockChain.slice(start);
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
