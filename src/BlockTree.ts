import { Block, BlockContent } from "./Blockchain"

// export interface ChainDetails {
//   blockchain: Array<Block<BlockContent>>
// 	nodeList: Array<TreeNode>
// }

export interface TreeNode {
	position: number
	parent: number
	child: Array<number>
  ancestorCount: number
}

export interface UUIDMap {
	[uuid: string]: number
}

export interface BlockchainTreeStruct {
	blockchain: Array<Block<BlockContent>>
	nodeList: Array<TreeNode>
	uuidMap: UUIDMap
  longestChainHeadPos: number
  longestChainHeadCount: number
}

export default class BlockchainTree {
  private struct: BlockchainTreeStruct;
  private listeners: Array<(block: Block<BlockContent>) => any>;

  /**
   * Create a BlockchainTree.
   *
   * Include an existing struct to recreate a tree from the network.
   *
   * @param {BlockchainTreeStruct} [struct] : (Optional) Struct to build the tree with
   */
  constructor(struct?: BlockchainTreeStruct) {
    this.listeners = [];
    if (!struct) {
      this.struct = {
        blockchain : [],
        nodeList : [],
        uuidMap : {},
        longestChainHeadPos: -1,
        longestChainHeadCount: -1
      };
    }
    else {
      this.struct = struct;
    }
  }

  private getUUIDPos(uuid: string) {
    return this.struct.uuidMap[uuid];
  }

  /**
   * Validate that this block is valid
   *
   * @throws {Error} if block is null/undefined or no data or no uuid
   */
  private validateBlock(block: Block<BlockContent>) {
    if (!block || !block.data || !block.data.uuid) {
      throw new Error("Invalid Block");
    }
  }

  private updateParentChild(pos: number, childPos: number) {
    if (pos >= 0) {
      this.struct.nodeList[pos].child.push(childPos);
    }
  }

  private async notifyListeners(block: Block<BlockContent>) {
    this.listeners.forEach(function (callback) {
      callback(block);
    })
  }

  uuidExists(uuid: string) {
    return this.struct.uuidMap[uuid] != undefined;
  }

  /**
   * Adds a new block to the blockchain tree.
   *
   * @param {Block} block : Block to add to the chatString
   * @throws {Error} If the block's UUID exists or parent is invalid
   */
  addBlock(block: Block<BlockContent>) {
      this.validateBlock(block);
      // Don't add if this block's uuid exists
      if (this.uuidExists(block.data.uuid)) {
        return;
      }
      // console.log(block.data.previous_uuid);
      let parentPos = (block.data.previous_uuid) ? this.getUUIDPos(block.data.previous_uuid) : -1;
      if (parentPos == undefined) {
        throw new Error("Invalid parent");
      }

      let ancestorCount = (parentPos >= 0) ? this.struct.nodeList[parentPos].ancestorCount + 1 : 0
      let pos = this.struct.blockchain.length;
      this.struct.blockchain[pos] = block;
      this.struct.nodeList[pos] = {
        position : pos,
        parent : parentPos,
        child : [],
        ancestorCount: ancestorCount
      };

      if (ancestorCount > this.struct.longestChainHeadCount) {
        this.struct.longestChainHeadPos = pos;
        this.struct.longestChainHeadCount = ancestorCount;
      }

      this.updateParentChild(parentPos, pos);

      this.struct.uuidMap[block.data.uuid] = pos;

      this.notifyListeners(block);
  }

  /**
   * Returns the parent in the chain of this block or null if it is a root.
   *
   * @param {Block} block
   * @returns {Block | null} The parent block or null if this is a root
   */
  getParent(block: Block<BlockContent>) {
    this.validateBlock(block);
    if (!this.uuidExists(block.data.uuid)) {
      throw new Error("This block doesn't exists in this struct");
    }

    let pos = this.getUUIDPos(block.data.uuid);
    let node = this.struct.nodeList[pos];
    let parentPos = node.parent;

    if (parentPos < 0) {
      return null;
    }
    else {
      return this.struct.blockchain[parentPos];
    }
  }


  /**
   * Returns the head block from the longest chain in the tree.
   *
   * @returns {Block | null} returns the head of the longest chain, null if tree is empty.
   */
  getHead() {
    let headPos = this.struct.longestChainHeadPos;
    let head = this.struct.blockchain[headPos];
    if (head == undefined) {
      return null;
    }
    else {
      return head;
    }
  }

  /**
   * Returns all descendant from this uuid's blocks.
   *
   * @param {string} uuid : Ancestor uuid
   * @returns {Array<Block>}
   */
  getBlocksSince(uuid: string) {
    let nodePos = this.getUUIDPos(uuid);
    let nodeList: Array<Block<BlockContent>> = [];
    if (nodePos != undefined) {
        this.traverse(this.struct.nodeList[nodePos], nodeList);
    }
    return nodeList;
  }

  /**
   * Returns a block and count ancestors.
   *
   * @param {string} uuid : descendant uuid
   * @param {number} count : Number of ancestors.
   */
  getBlocksTo(uuid: string, count: number) {
    let nextNodePos = this.getUUIDPos(uuid);

    let blockList: Array<Block<BlockContent>> = [];

    if (nextNodePos != undefined) {
        for (let i = 0; i <= count && nextNodePos != -1; i++) {
          let node = this.struct.nodeList[nextNodePos];
          let block = this.struct.blockchain[nextNodePos];
          blockList.unshift(block);
          nextNodePos = node.parent;
        }
    }
    return blockList;
  }

  private traverse(node : TreeNode, blockList : Array<Block<BlockContent>>) {
    blockList.push(this.struct.blockchain[node.position]);
    if (node.child.length > 0) {
      for(let i in node.child) {
        this.traverse(this.struct.nodeList[node.child[i]], blockList);
      }
    }
  }

  /**
   * Returns the block for this uuid or null if it doesn't exists.
   *
   * @param {string} uuid : UUID of the block to get
   * @returns {Block | null} The block or null if none existant
   */
  getBlock(uuid: string | null) {
    let normalized_uuid = (uuid != null) ? uuid : "";

    if (!this.uuidExists(normalized_uuid)) {
      return null;
    }
    else {
      return this.struct.blockchain[this.getUUIDPos(normalized_uuid)];
    }
  }

  /**
   * Listen for any new block to the blockchain
   *
   * @param callback : Function which take a block, new block added
   * @returns {Void}
   */
  listen(callback: (block: Block<BlockContent>) => any) {
    this.listeners.push(callback);
  }


  // TODO change to the real toString .. no time
  displayNicely() {
    var chainStrList: Array<string> = [];
    this.struct.blockchain.forEach(function (block) {
      chainStrList.push("type: " + block.data.content.type + ", uuid: " + block.data.uuid + ", previous_uuid: " + block.data.previous_uuid + ", sequence: " + block.data.sequence + "\n");
    })
    var nodeStrList = JSON.stringify(this.struct.nodeList);
    var str = `blockchain:\n ${chainStrList}||\nnodeList:\n ${nodeStrList}`;
    console.log("Displaying tree");
    console.log(str);
  }

  getStruct() {
    return this.struct;
  }
}
