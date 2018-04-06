import { Entity, BlockContent } from "./Blockchain"

export interface Request {
	encrypted: string
}

export interface Relay {
	type: "relay"
	next: string
	encrypted: string
}

export interface Exit<T extends BlockContent> {
	type: "exit"
	content: Entity<T>
}
