const { createDevice } = require("./mediasoup")

const getMyStream = async (parameter) => {
	try {
		let config = {
			video: parameter.isVideo,
			audio: parameter.isAudio,
		}
		const stream = await navigator.mediaDevices.getUserMedia(config)
		parameter.localStream = stream
        parameter.videoParams.track = stream.getVideoTracks()[0]
        parameter.audioParams.track = stream.getAudioTracks()[0]
	} catch (error) {
		console.log("- Error Getting My Stream : ", error)
	}
}

const getRoomId = async (parameter) => {
	try {
		const url = window.location.pathname
		const parts = url.split("/")
		const roomName = parts[2]
		parameter.roomName = roomName
	} catch (error) {
		console.log("- Error Getting Room Id : ", error)
	}
}

const joinRoom = async ({ parameter, socket }) => {
	try {
		parameter.totalUsers++
		socket.emit("joinRoom", { roomName: parameter.roomName, username: parameter.username }, (data) => {
			parameter.rtpCapabilities = data.rtpCapabilities
            createDevice({ parameter, socket })
		})
	} catch (error) {
		console.log("- Error Joining Room : ", error)
	}
}

module.exports = { getMyStream, getRoomId, joinRoom }
