export interface Peer {
  address: string
  port: number
  ttl: number
}

interface PeerMap {
  [address: string]: {[port: number]: PeerNode}
}

interface PeerNode {
  peer: Peer
  timestamp: number
}

export default class PeerSet {
  private peerList: Array<PeerNode>;
  private peerMap: PeerMap;

  constructor() {
    this.peerList = [];
    this.peerMap = {};
  }

  /**
   * Adds a peer to the set, if the tuple (address,port) exists, update the ttl.
   *
   * If the peer exists, also update the addition timestamp
   *
   * @param {Peer} peer : Peer to add to the set
   * @returns {Boolean} true on success, false if peer is invalid
   */
  addPeer(peer: Peer) {
    if (peer && peer.address && peer.port && peer.ttl >= 0) {
      let existingNode = this.peerMap[peer.address][peer.port];
      if (existingNode) {
        existingNode.peer.ttl = peer.ttl;
        existingNode.timestamp = Date.now();
      }
      else {
        let node: PeerNode = {
          peer: peer,
          timestamp: Date.now()
        };
        this.peerMap[peer.address][peer.port] = node;
        this.peerList.push(node);
      }
    }
    else {
      return null;
    }
  }

  /**
   * Returns a list of up to 'count' random peers.
   *
   * @param {number} count: Number of peers to retrieve
   *
   * @returns {Array<Peer>} List of 'count' random peers.
   */
  getRandomPeerList(count: number) {
    // Partial Fisher-Yates shuffle to sample
    let sample: Array<Peer> = [];

    let i = 0;
    while (i < count && i < this.peerList.length) {
      let pick = Math.floor(Math.random() * (this.peerList.length - i));
      let nodePick = this.peerList[pick];

      if (this.peerIsDead(nodePick)) {
        this.removePeer(pick);
        continue;
      }
      sample.push(nodePick.peer);
      this.swapNode(pick, this.peerList.length)
      i++;
    }
  }

  /**
   * Return a list of all peers that are alive.
   *
   * @returns {Array<Peer>} All alive peers
   */
  getAllPeers() {
    let peers: Array<Peer> = [];
    for (let i = 0; i < this.peerList.length; i++) {
      let node = this.peerList[i];
      if (this.peerIsDead(node)) {
        this.removePeer(i);
      }
      else {
        peers.push(node.peer);
      }
    }

    return peers;
  }

  /**
   * Swaps two node in the peerList
   *
   * @param {number} pos0
   * @param {number} pos1
   * @returns {void}
   */
  private swapNode(pos0: number, pos1: number) {
    let temp = this.peerList[pos0];
    this.peerList[pos0] = this.peerList[pos1];
    this.peerList[pos1] = temp;
  }

  /**
   * Returns true if the peer is dead according to its ttl and timestamp of addition.
   *
   * @param {PeerNode} node : Node to check for liveness
   * @returns {Boolean} true if the peer is alive
   */
  private peerIsDead(node: PeerNode) {
    return (Date.now() - node.timestamp) > node.peer.ttl;
  }

  /**
   * Remove the peer from the list and map.
   *
   * @param {number} pos : Position of the peer to delete in the list
   * @returns {Void}
   */
  private removePeer(pos: number) {
    let node = this.peerList[pos];
    this.peerList.splice(pos, 1);
    delete this.peerMap[node.peer.address][node.peer.port];

    if (Object.keys(this.peerMap[node.peer.address]).length <= 0) {
      delete this.peerMap[node.peer.address];
    }
  }
}
