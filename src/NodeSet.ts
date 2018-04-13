import { OnionNode } from "./Blockchain"

interface NodeMap {
  [host: string]: {[port: number]: NodeContainer}
}

interface NodeContainer {
  node: OnionNode
}

export default class NodeSet {
  private nodeList: Array<NodeContainer>;
  private nodeMap: NodeMap;
  private TTL: number = 30000;

  constructor() {
    this.nodeList = [];
    this.nodeMap = {};
  }

  /**
   * Upsert a node to the set.
   *
   * @param {OnionNode} node : node to add to the set
   * @returns {Boolean} true on success, false if node is invalid
   */
  addPeer(node: OnionNode) {
    if (node && node.type == "node" && node.host && node.port && node.timestamp) {
      let existingContainer: NodeContainer | undefined = (this.nodeMap[node.port]) ? this.nodeMap[node.host][node.port] : undefined;
      if (existingContainer) {
        existingContainer.node = node;
      }
      else {
        let nodeContainer: NodeContainer = {
          node: node
        };
        if (!this.nodeMap[node.host]) {
          this.nodeMap[node.host] = {};
        }
        this.nodeMap[node.host][node.port] = nodeContainer;
        this.nodeList.push(nodeContainer);
      }
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Returns a list of up to 'count' random and active OnionNode.
   *
   * @param {number} count: Number of peers to retrieve
   *
   * @returns {Array<OnionNode>} List of 'count' random peers.
   */
  getRandomNodeList(count: number) {
    // Partial Fisher-Yates shuffle to sample
    let sample: Array<OnionNode> = [];

    let i = 0;
    while (i < count && i < this.nodeList.length) {
      let pick = Math.floor(Math.random() * (this.nodeList.length - i));
      let nodeTuplePick = this.nodeList[pick];

      if (this.nodeIsDead(nodeTuplePick.node)) {
        // console.log('PeerSet: Dead Peer, removing -- ' + JSON.stringify(nodePick));
        this.removeNode(pick);
        continue;
      }
      sample.push(nodeTuplePick.node);
      this.swapNode(pick, this.nodeList.length - 1)

      i++;
    }

    return sample;
  }

  /**
   * Swaps two node in the nodeList
   *
   * @param {number} pos0
   * @param {number} pos1
   * @returns {void}
   */
  private swapNode(pos0: number, pos1: number) {
    let temp = this.nodeList[pos0];
    this.nodeList[pos0] = this.nodeList[pos1];
    this.nodeList[pos1] = temp;
  }

  /**
   * Returns true if the node is dead according to the TTL and timestamp.
   *
   * @param {OnionNode} node : Node to check for liveness
   * @returns {Boolean} true if the peer is alive
   */
  private nodeIsDead(node: OnionNode) {
    return ((Date.now() - node.timestamp) <= this.TTL);
  }

  /**
   * Remove the node from the list and map.
   *
   * @param {number} pos : Position of the node to delete in the list
   * @returns {Void}
   */
  private removeNode(pos: number) {
    let nodeContainer = this.nodeList[pos];
    this.nodeList.splice(pos, 1);
    delete this.nodeMap[nodeContainer.node.host][nodeContainer.node.port];

    if (Object.keys(this.nodeMap[nodeContainer.node.host]).length <= 0) {
      delete this.nodeMap[nodeContainer.node.host];
    }
  }
}
