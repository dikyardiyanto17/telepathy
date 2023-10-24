const { params } = require("../config/mediasoup")

class Parameters {
	localStream = null
	videoParams = { params, appData: { label: "video", isActive: true } }
	audioParams = { appData: { label: "audio", isActive: true } }
	consumingTransports = []
	consumerTransports = []
	totalUsers = 0
	allUsers = []
}

module.exports = { Parameters }
