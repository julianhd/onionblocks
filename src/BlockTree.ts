import { Block, BlockContent } from "./Blockchain"

export interface ChainDetails {
  blockchain: Array<Block<BlockContent>>
	nodeList: Array<TreeNode>
}

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

  /**
   * Create a BlockchainTree.
   *
   * Include an existing struct to recreate a tree from the network.
   *
   * @param {BlockchainTreeStruct} [struct] : (Optional) Struct to build the tree with
   */
  constructor(struct?: BlockchainTreeStruct) {
    if (!struct) {
      this.struct = {
        blockchain : [],
        nodeList : [],
        uuidMap : {},
        longestChainHeadPos: -1,
        longestChainHeadCount: 0
      };
    }
    else {
      this.struct = struct;
    }
  }

  private uuidExists(uuid: string) {
    return this.struct.uuidMap[uuid] != undefined;
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
        throw new Error("Block exists in this struct: Existing UUID");
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
      }

      this.updateParentChild(parentPos, pos);

      this.struct.uuidMap[block.data.uuid] = pos;
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
    if (!head) {
      return null;
    }
    else {
      return head;
    }
  }

  /**
   * Returns a ChainDetails from pos(uuid) + 1.
   *
   * @param {string} uuid Exclusive uuid from which to start the slice
   * @returns {ChainDetails}
   */
  getChainSince(uuid: string) {
    var chaindetails: ChainDetails;
    if (!this.uuidExists(uuid)) {
      chaindetails = {
        blockchain: [],
        nodeList: []
      }
    }
    else {
      let pos = this.getUUIDPos(uuid);
      chaindetails = {
        blockchain: this.struct.blockchain.slice(pos+1),
        nodeList: this.struct.nodeList.slice(pos+1)
      }
    }
    return chaindetails;
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

  // TODO change to the real toString .. no time
  displayNicely() {
    var chainStrList: Array<string> = [];
    this.struct.blockchain.forEach(function (block) {
      chainStrList.push("type: " + block.data.content.type + ", uuid: " + block.data.uuid + ", previous_uuid: " + block.data.previous_uuid + ", sequence: " + block.data.sequence + "\n");
    })
    var nodeStrList = JSON.stringify(this.struct.nodeList);
    var str = `blockchain:\n ${chainStrList}||\nnodeList:\n ${nodeStrList}`;
    // console.log("Displaying tree");
    // console.log(str);
  }

  // getRouteFromNodeToRoot(uuid: string) {
  //   return this.getRouteFromNodeToAncestor(uuid, this.struct.blockchain[0].data.uuid);
  // }
  //
  // getRouteFromNodeToAncestor(uuidFrom: string, uuidAncestor: string) {
  //   if (!this.uuidExists(uuidFrom)) {
  //     throw new Error("Invalid starting uuid");
  //   }
  //   if (!this.uuidExists(uuidAncestor)) {
  //     throw new Error("Invalid ancestor uuid");
  //   }
  //   let route = [];
  //   let childPos = this.getUUIDPos(uuidFrom);
  //   let ancestorPos = this.getUUIDPos(uuidAncestor);
  //
  //   while ()
  //
  // }

  getStruct() {
    return this.struct;
  }
}
