const mediasoup = require("mediasoup")
const { webRtcTransport_options } = require("../../config/mediasoup/config")

class Mediasoup_Parameter {
	transports = []
	producers = []
	consumers = []
}

const createWorker = async () => {
	let worker = await mediasoup.createWorker({
		// rtcMinPort: 2000,
		// rtcMaxPort: 10000,
	})

	worker.on("died", (error) => {
		console.log(error)
		setTimeout(() => process.exit(1), 2000)
	})

	return worker
}

const createWebRtcTransport = async (router) => {
	try {
		let transport = await router.createWebRtcTransport(webRtcTransport_options)

		transport.on("dtlsstatechange", (dtlsState) => {
			if (dtlsState === "closed") {
				transport.close()
			}
		})

		transport.on("close", () => {
			console.log("transport closed")
		})

		return transport
	} catch (error) {
		console.log("- Error Creating WebRTC Transport : ", error)
	}
}

const getTransport = ({ socketId, mediasoupParameter }) => {
	const [producerTransport] = mediasoupParameter.transports.filter((transport) => transport.socketId === socketId && !transport.consumer)
	return producerTransport.transport
}

const informConsumer = ({ roomName, socketId, producerId, mediasoupParameter, serverParameter }) => {
	try {
		mediasoupParameter.producers.forEach((producerData) => {
			if (producerData.socketId !== socketId && producerData.roomName === roomName) {
				const producerSocket = serverParameter.allUsers[producerData.socketId].socket
				producerSocket.emit("new-producer", { producerId, socketId })
			}
		})
	} catch (error) {
		console.log("- Error Informing New Consumer : ", error)
	}
}
module.exports = { createWorker, Mediasoup_Parameter, createWebRtcTransport, getTransport, informConsumer }
