const express = require("express")
const cors = require("cors")
const router = require("./routes/index.js")
const app = express()
const port = 3001
// const port = 80
const http = require("http")
const path = require("path")
const https = require("httpolyglot")
const { Server } = require("socket.io")
const mediasoup = require("mediasoup")
const { options } = require("./certif")
const { webRtcTransport_options, mediaCodecs } = require("./config/mediasoup/config")
const { Server_Parameter } = require("./helpers/server_parameters.js")
const { Room } = require("./helpers/rooms.js")
const { Users } = require("./helpers/users.js")
const { createWorker, Mediasoup_Parameter, createWebRtcTransport, getTransport, informConsumer } = require("./helpers/mediasoup/index.js")

app.use(cors())
app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "views")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static("public"))
app.use(express.static(path.join(__dirname, "public")))

const httpsServer = https.createServer(options, app)
httpsServer.listen(port, () => {
	console.log("App On : " + port)
})
let serverParameter = new Server_Parameter()
let mediasoupParameter = new Mediasoup_Parameter()

const init = async () => {
	try {
		serverParameter.worker = await createWorker()
	} catch (error) {
		console.log("Failed Initialization")
	}
}

init()
const io = new Server(httpsServer)

// const httpServer = http.createServer(app)
// httpServer.listen(port, () => {
// 	console.log("App On : " + port)
// })

// const io = new Server(httpServer)

io.on("connection", async (socket) => {
	socket.emit("connection-success", {
		socketId: socket.id,
	})

	socket.on("disconnect", () => {
		console.log("- Disconnected : ", socket.id)

		serverParameter.allUsers[socket.id].producers.forEach((producerId) => {
			socket.emit("producer-closed", { remoteProducerId: producerId, socketId: socket.id })
		})
		mediasoupParameter.consumers.forEach((consumerData) => {
			if (consumerData.socketId == socket.id) {
				consumerData.consumer.close()
			}
		})

		mediasoupParameter.consumers = mediasoupParameter.consumers.filter((data) => data.socketId !== socket.id)

		mediasoupParameter.producers.forEach((producerData) => {
			if (producerData.socketId == socket.id) {
				producerData.producer.close()
			}
		})

		mediasoupParameter.producers = mediasoupParameter.producers.filter((data) => data.socketId !== socket.id)

		mediasoupParameter.transports.forEach((transportData) => {
			if (transportData.socketId == socket.id) {
				transportData.transport.close()
			}
		})

		mediasoupParameter.transports = mediasoupParameter.transports.filter((data) => data.socketId !== socket.id)

		serverParameter.allRooms[serverParameter.allUsers[socket.id].roomName].participants = serverParameter.allRooms[
			serverParameter.allUsers[socket.id].roomName
		].participants.filter((user) => user.socketId !== socket.id)

		if (serverParameter.allRooms[serverParameter.allUsers[socket.id].roomName].participants.length == 0) {
			serverParameter.allRooms[serverParameter.allUsers[socket.id].roomName].router.close()
			delete serverParameter.allRooms[serverParameter.allUsers[socket.id].roomName]
		}
		delete serverParameter.allUsers[socket.id]
	})

	socket.on("joinRoom", async ({ roomName, username }, callback) => {
		try {
			let router
			if (!serverParameter.allRooms[roomName]) {
				router = await serverParameter.worker.createRouter({ mediaCodecs })
				serverParameter.allRooms[roomName] = new Room(roomName, router)
				serverParameter.allRooms[roomName].participants = []
			} else {
				router = serverParameter.allRooms[roomName].router
			}
			serverParameter.allRooms[roomName].participants = [...serverParameter.allRooms[roomName].participants, new Users(username, socket.id, roomName)]
			serverParameter.allUsers[socket.id] = { socketId: socket.id, roomName, socket, producers: [], consumers: [], transports: [] }
			const rtpCapabilities = router.rtpCapabilities
			callback({ rtpCapabilities })
		} catch (error) {
			console.log("- Error Joining Room : ", error)
		}
	})

	socket.on("create-webrtc-transport", async ({ consumer, roomName }, callback) => {
		try {
			let router = serverParameter.allRooms[roomName].router
			const transport = await createWebRtcTransport(router)
			let username
			const editParticipants = serverParameter.allRooms[roomName].participants.map((data) => {
				if (data.socketId == socket.id) {
					data.transports = [...data.transports, transport.id]
					username = data.username
				}
				return data
			})
			mediasoupParameter.transports = [...mediasoupParameter.transports, { socketId: socket.id, transport, roomName, consumer, username }]
			serverParameter.allRooms[roomName].participants = [...editParticipants]
			serverParameter.allUsers[socket.id].transports = [...serverParameter.allUsers[socket.id].transports, transport.id]
			callback({
				params: {
					id: transport.id,
					iceParameters: transport.iceParameters,
					iceCandidates: transport.iceCandidates,
					dtlsParameters: transport.dtlsParameters,
				},
			})
		} catch (error) {
			console.log("- Error Creating WebRTC Transport : ", error)
		}
	})

	socket.on("transport-connect", ({ dtlsParameters }) => {
		getTransport({ socketId: socket.id, mediasoupParameter }).connect({ dtlsParameters })
	})

	socket.on("transport-produce", async ({ kind, rtpParameters, appData, roomName }, callback) => {
		try {
			const producer = await getTransport({ socketId: socket.id, mediasoupParameter }).produce({
				kind,
				rtpParameters,
				appData,
			})
			let username
			const editParticipants = serverParameter.allRooms[roomName].participants.map((data) => {
				if (data.socketId == socket.id) {
					data.producers = [...data.producers, producer.id]
					username = data.username
				}
				return data
			})
			mediasoupParameter.producers = [...mediasoupParameter.producers, { producer, socketId: socket.id, roomName, username }]

			serverParameter.allRooms[roomName].participants = [...editParticipants]
			serverParameter.allUsers[socket.id].producers = [...serverParameter.allUsers[socket.id].producers, producer.id]
			// console.log("- Server Parameter : ", serverParameter.allRooms[roomName].participants)
			// console.log("- Mediasoup Parameter : ", mediasoupParameter)

			producer.on("transportclose", () => {
				producer.close()
			})

			informConsumer({ roomName, socketId: socket.id, producerId: producer.id, mediasoupParameter, serverParameter })

			callback({ kind, id: producer.id, producersExist: serverParameter.allRooms[roomName].participants.length > 1 ? true : false })
		} catch (error) {
			console.log("- Error Producing Producer : ", error)
		}
	})

	socket.on("get-producers", ({ roomName }, callback) => {
		let producerList = []
		serverParameter.allRooms[roomName].participants.forEach((data) => {
			if (socket.id != data.socketId) {
				data.producers.forEach((producer) => {
					producerList = [...producerList, producer]
				})
			}
		})
		callback(producerList)
	})

	socket.on("transport-recv-connect", async ({ dtlsParameters, serverConsumerTransportId }) => {
		try {
			const consumerTransport = mediasoupParameter.transports.find(
				(transportData) => transportData.consumer && transportData.transport.id == serverConsumerTransportId
			).transport
			// console.log("- Consumer Transport : ", consumerTransport)
			consumerTransport.connect({ dtlsParameters })
		} catch (error) {
			console.log("- Error Connecting Transport Receive : ", error)
		}
	})

	socket.on("consume", async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId, roomName }, callback) => {
		try {
			const router = serverParameter.allRooms[roomName].router
			let consumerTransport = mediasoupParameter.transports.find(
				(transportData) => transportData.consumer && transportData.transport.id == serverConsumerTransportId
			).transport

			let producerData = mediasoupParameter.producers.find((producer) => producer.producer.id == remoteProducerId)

			let producerSocket = producerData.socketId
			let appData = producerData.producer.appData
			if (
				router.canConsume({
					producerId: remoteProducerId,
					rtpCapabilities,
				})
			) {
				const consumer = await consumerTransport.consume({
					producerId: remoteProducerId,
					rtpCapabilities,
					paused: true,
					appData,
				})

				let params = {
					id: consumer.id,
					producerId: remoteProducerId,
					kind: consumer.kind,
					rtpParameters: consumer.rtpParameters,
					serverConsumerId: consumer.id,
					appData,
					producerSocketOwner: producerSocket,
					username: producerData.username,
				}

				consumer.on("transportclose", () => {
					console.log("transport close from consumer")
				})

				consumer.on("producerclose", () => {
					socket.emit("producer-closed", { remoteProducerId, socketId: producerSocket })

					consumerTransport.close([])
					mediasoupParameter.transports = mediasoupParameter.transports.filter((transportData) => transportData.transport.id !== consumerTransport.id)
					consumer.close()
					mediasoupParameter.consumers = mediasoupParameter.consumers.filter((consumerData) => consumerData.consumer.id !== consumer.id)
				})

				serverParameter.allUsers[socket.id].consumers = [...serverParameter.allUsers[socket.id].consumers, consumer.id]

				mediasoupParameter.consumers = [...mediasoupParameter.consumers, { consumer, roomName, socketId: socket.id, username: producerData.username }]

				callback({ params })
			}
		} catch (error) {
			console.log("- Error Consuming : ", error)
		}
	})

	socket.on("consumer-resume", async ({ serverConsumerId }) => {
		const getConsumer = mediasoupParameter.consumers.find((consumerData) => consumerData.consumer.id === serverConsumerId)
		if (getConsumer) {
			const { consumer } = getConsumer
			await consumer.resume()
		}
	})
})

app.use(router)
