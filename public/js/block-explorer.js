class BlockExplorer extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			blocks: [],
			showNodes: true,
		}
	}

	componentDidMount() {
		const websocket = new WebSocket(`ws://${window.location.host}/api/blocks`)
		websocket.onmessage = async event => {
			const data = JSON.parse(event.data)
			data.__signature = await sha256(data.data.signature)
			data.__key = await sha256(data.data.public)
			if (data.data.content.type === "node") {
				data.__node_public = await sha256(data.data.content.public)
			}
			if (data.data.content.type === "user") {
				data.__user_public = await sha256(data.data.content.public)
			}
			this.setState(prevState => ({
				blocks: [data, ...prevState.blocks],
			}))
		}
	}

	render() {
		const elements = []
		for (const block of this.state.blocks) {
			const { data } = block
			if (!this.state.showNodes && data.content.type === "node") {
				continue
			}
			const visualizer = (
				<div className="bx-block" key={data.uuid}>
					<BlockProp name="ID" content={data.uuid} />
					<BlockProp name="Previous" content={data.previous_uuid || "null"} />
					<BlockProp name="Nonce" content={data.nonce} />
					<BlockProp name="Signature" content={block.__signature} />
					<BlockProp name="Public Key" content={block.__key} />
					<BlockProp name="Type" content={data.content.type} />
					{data.content.type === "node" ? (
						<div>
							<BlockProp name="Timestamp" content={data.content.timestamp} />
							<BlockProp name="Host" content={data.content.host} />
							<BlockProp name="Port" content={data.content.port} />
							<BlockProp name="Public Key" content={block.__node_public} />
						</div>
					) : null}
					{data.content.type === "chat" ? (
						<div>
							<BlockProp name="Timestamp" content={data.content.timestamp} />
							<BlockProp name="From" content={data.content.from} />
							<BlockProp name="Message" content={data.content.message} />
						</div>
					) : null}
					{data.content.type === "user" ? (
						<div>
							<BlockProp name="Timestamp" content={data.content.timestamp} />
							<BlockProp name="Name" content={data.content.name} />
							<BlockProp name="Public Key" content={block.__user_public} />
						</div>
					) : null}
				</div>
			)
			elements.push(visualizer)
		}
		return (
			<div>
				<label>
					Show nodes:
					<input
						type="checkbox"
						checked={this.state.showNodes}
						onChange={this.handleShowNodesChange}
					/>
				</label>
				<br />
				{elements}
			</div>
		)
	}

	handleShowNodesChange = event => {
		this.setState({
			showNodes: event.target.checked,
		})
	}
}

function BlockProp({ name, content }) {
	return (
		<div>
			<span className="bx-prop">{name}</span>{" "}
			<span className="bx-content">{content}</span>
		</div>
	)
}

ReactDOM.render(
	<BlockExplorer />,
	document.getElementById("block-explorer-root"),
)

function sha256(str) {
	var shaObj = new jsSHA("SHA-256", "TEXT")
	shaObj.update(str)
	var hash = shaObj.getHash("HEX")
	return hash
}
