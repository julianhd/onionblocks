import http from "http"
import express from "express"
import bodyParser from "body-parser"
import { Block, BlockContent } from "./Blockchain"
import BlockchainVerifier, { MissingBlockError } from "./BlockchainVerifier"
import BlockchainTree, { BlockchainTreeStruct } from "./BlockTree"
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
  private RECOVERY_BLOCK_COUNT: number = 15;
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
  constructor(
    blockTree: BlockchainTree,
    updateInterval: number,
    thisHost: string,
    thisPort: number,
    masterHost: string,
    masterPort: number
  ) {
    this.blockTree = blockTree;
    this.verifier = new BlockchainVerifier();
    this.peers = new PeerSet();
    this.thisPeer = {
      address: thisHost,
      port: thisPort,
      ttl: this.DEFAULT_TTL,
      isMaster: false
    };
    this.holdBackQueue = [];
    this.inRecovery = false;

    this.addMasterPeer(masterHost, masterPort);
    this.initBlockchain();

    this.blockTree.listen(this.broadcastBlock.bind(this));

    const app = express();
    app.use(bodyParser.json());

    // Post a new block to this server
    app.post('/block', async (req, res) => {
      // console.log("BlockchainServer: request post " + JSON.stringify(req.body));
      var status;
      if (!req.body || !(await this.addBlock(req.body))) {
        status = 400;
      }
      else {
        status = 200;
      }
      return res.status(status).json({});
    });

    // Retrieve the blockchain partially or fully
    app.get('/blockchain', (req, res) => {
      var since = req.query.since;
      if (!since) {
        res.json(this.blockTree.getStruct());
      }
      else {
        let blocks = {
          blockchain: this.blockTree.getBlocksSince(since)
        };
        res.json(blocks);
      }
    });

    // Retrieve a specific block with a number of ancestors
    app.get('/blockchain/:uuid', (req, res) => {
      let uuid = req.params.uuid;
      let count = Number.parseInt(req.query.count);

      if (!Number.isInteger(count)) {
        count = 0;
      }

      if (!uuid) {
        res.status(400).json({})
      }
      else {
        let block = {
          blocks: this.blockTree.getBlocksTo(uuid, count)
        };
        res.json(block);
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
   * @param {boolean} isRecovery : Set to true so it doesn't try to recover a recovery
   * @returns {boolean} true if the block was successfully added, false on verification error.
   */
  private async addBlock(block: Block<BlockContent>, isRecovery?: boolean) {
    // console.log("New Block\n " + JSON.stringify(block));

    // Put the block in holdBackQueue if we're currently recovering from failure.
    // It will be processed later by the recovery mechanism
    if (this.inRecovery && !isRecovery) {
      // console.log('Adding to holdBackQueue -- ' + JSON.stringify(block));
      this.holdBackQueue.push(block);
    }
    else {
      try {
        if (!this.blockTree.uuidExists(block.data.uuid)) {
          this.verifier.verify(this.blockTree, block);
          this.blockTree.addBlock(block);
          // this.blockTree.displayNicely();
        }
      } catch(err) {
        if (err instanceof MissingBlockError) {
          console.log('MissingBlockError ' + JSON.stringify(err));
          if (!isRecovery) {
            await this.recover(block);
          }
          else {
            console.log("BlockChainServer: BlockChain failed to recover");
            throw err;
          }
        }
        else {
          console.log("BlockChainServer: BlockChain Verify failed -- " + JSON.stringify(err));
          return false;
        }
      }
    }
    return true;
  }

  private async syncPeers() {
    console.log('BlockChainServer: Syncing peers');
    let updatePeerList = this.peers.getRandomPeerList(this.PEER_FETCH_COUNT);
    // console.log('BlockChainServer: Peer list\n' + JSON.stringify(updatePeerList));
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
        // console.log(`BlockChainServer: syncPeers response: ${response.body}`);
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

  private async recover(fromBlock: Block<BlockContent>) {
    this.inRecovery = true;
    let recoveryPeers = this.peers.getAllPeers();
    for (let i in recoveryPeers) {
      try {
        if (await this.checkPeerForBlock(fromBlock, recoveryPeers[i])) {
          this.initBlockchain(recoveryPeers[i]);
        };
      } catch(err) {
        continue;
      }
      console.log('BlockChainServer: Recovery Finished');
      break;
    }
    // Complete recovery on next tick
    // process.nextTick(async () => {
      console.log('BlockChainServer: Emptying holdbackqueue');
      this.inRecovery = false;
      while(this.holdBackQueue.length > 0) {
        let nextBlock = this.holdBackQueue.shift();
        if (nextBlock) {
          await this.addBlock(nextBlock, true);
        }
      }
      console.log('BlockChainServer: Finished Emptying holdBackQueue');
  }

  private async checkPeerForBlock(block: Block<BlockContent>, peer: Peer) {
    let missingBlockUUID = block.data.previous_uuid;
    let recoveredBlocks = [];
    try {
      let responseStr = await got(`http://${peer.address}:${peer.port}/blockchain/`
        + `${missingBlockUUID}`);
      // console.log(`BlockChainServer: recover response: ${responseStr.body}`);
      let response = JSON.parse(responseStr.body);
      if (response && response.blocks && response.blocks.length == 1) {
        // This peer has the missing block
        return true;
      }
    } catch (err) {
      throw err;
    }
    return false;
  }

  /**
   * Initializes the blockchain from known peers.
   */
  private async initBlockchain(peer?: Peer) {
    let peers: Array<Peer> = [];
    if (peer) {
      peers.push(peer);
    }
    else {
      peers = this.peers.getRandomPeerList(this.RECOVERY_PEER_COUNT);
    }

    // console.log('BlockChainServer: Peer recovery -- ' + JSON.stringify(peers));
    let blockList: Array<Block<BlockContent>> = [];
    for (let i in peers) {
      console.log('BlockChainServer: Recovering from peer -- ' + JSON.stringify(peers[i]));
      try {
          let response = await got(`http://${peers[i].address}:${peers[i].port}/blockchain`);
          // console.log(`BlockChainServer: init response: ${response.body}`);
          let blocktreeStruct: BlockchainTreeStruct = JSON.parse(response.body);
          if (blocktreeStruct && blocktreeStruct.blockchain) {
            blockList = blocktreeStruct.blockchain;
          }
          // console.log('BlockChainServer: BLOCKLISt -- ' + JSON.stringify(blockList));
          for (let i in blockList) {
            // console.log(`BlockChainServer: adding block -- ` + JSON.stringify(blockList[i]) );
            this.addBlock(blockList[i], true);
          }
      } catch (err) {
        console.log('BlockChainServer: Unable to init from peer: ' + JSON.stringify(peers[i]));
        continue;
      }
      if (blockList.length > 0) {
        break;
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
    // console.log('BlockChainServer: Broadcasting new block');
    let allPeers = this.peers.getAllPeers();
    for (let i = 0; i < allPeers.length; i++) {
      let peer = allPeers[i];
      try {
        // Register yourself with that peer
        got(`http://${peer.address}:${peer.port}/block`, {
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
