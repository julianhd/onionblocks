import http from "http"
import express from "express"
import bodyParser from "body-parser"
import { Block, BlockContent } from "./Blockchain"
import BlockChainVerifier from "./BlockchainVerifierDummy"



class BlockChainServer {
  private blockChain: Array<Block<BlockContent>>;

  server: http.Server;

  constructor() {
    this.blockChain = [];

    const app = express();
    app.use(bodyParser.json());
    app.post('/block', (req, res) => {
      var status;
      if (!req.body || !this.postBlock(req.body)) {
        status = 400;
      } else {
        status = 200;
      }
      return res.sendStatus(status);
    });

    app.get('/blockchain', this.getBlockchain);
    this.server = http.createServer(app);
  }

  private postBlock(block: Block<BlockContent>) {
    console.log("New Block\n " + JSON.stringify(block));

    let chainClone = this.blockChain.slice();
    chainClone.push(block);
    try {
      BlockChainVerifier.verify(chainClone);
    } catch (err) {
      console.log("BlockChain Verify failed");
      console.log(err);
      return false;
    }
    this.blockChain = chainClone;
    console.log(this.blockChain);
    return true;
  }

  private getBlockchain(request, response) {

  }


}

export default function createBlockChainServer() {
  const blockChainServer = new BlockChainServer();
  return blockChainServer.server;
}
