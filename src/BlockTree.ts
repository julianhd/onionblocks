import { Block, BlockContent } from "./Blockchain"

export interface ChainDetails {
  blockchain: Array<Block<BlockContent>>
	nodeList: Array<TreeNode>
}

export interface TreeNode {
	position: number
	parent: number
	child: Array<number>
}

export interface UUIDMap {
	[uuid: string]: number
}

export interface BlockchainTreeStruct {
	blockchain: Array<Block<BlockContent>>
	nodeList: Array<TreeNode>
	uuidMap: UUIDMap
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
        uuidMap : {}
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

  /**
   * Adds a new block to the blockchain tree.
   *
   * @param {Block} block : Block to add to the chatString
   * @throws {Error} If the block's UUID exists
   */
  addBlock(block: Block<BlockContent>) {
      this.validateBlock(block);
      // Don't add if this block's uuid exists
      if (this.uuidExists(block.data.uuid)) {
        throw new Error("Block exists in this struct: Existing UUID");
      }
      let pos = this.struct.blockchain.length;
      this.struct.blockchain[pos] = block;
      this.struct.nodeList[pos] = {
        position : pos,
        parent : pos - 1,
        child : [],
      };
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


  getHead() {
    let head = this.struct.blockchain[this.struct.blockchain.length - 1];
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
