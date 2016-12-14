exports.init = function(io) {
	var allClientSockets = [];
	var allClients = [];

	var lobbySockets = [];
	var lobbyNames = []; //keep track of players in lobby

	var matchupSockets = []; // An array of socket pairs currently in a matchup and their board
	var matchupNames = [];

	function getOpponent(socket) {
		for (var idx = 0; idx < matchupSockets.length; idx++) {
			if (matchupSockets[idx][0] == socket) {
				return matchupSockets[idx][1];
			} else if (matchupSockets[idx][1] == socket) {
				return matchupSockets[idx][0];
			}
		}
	}

	function endMatchupAndBackToLobby(socket) {
		for (var idx = 0; idx < matchupSockets.length; idx++) {
			if ((matchupSockets[idx][0] == socket) || (matchupSockets[idx][1] == socket)) {

				var challengerSocket = matchupSockets[idx][0];
				var responderSocket = matchupSockets[idx][1];

				var challengerName = matchupNames[idx][0];
				var responderName = matchupNames[idx][1];

				matchupSockets.splice(idx, 1);
				matchupNames.splice(idx, 1);

				lobbySockets.push(challengerSocket);
				lobbySockets.push(responderSocket);

				lobbyNames.push(challengerName);
				lobbyNames.push(responderName);

				// No more looping
				return
			}
		}
	}

	function removeClient(socket) {
		var i = allClientSockets.indexOf(socket);
		allClientSockets.splice(i, 1);
		allClients.splice(i, 1);
	}

	function removeFromLobby(socket) {
		var i = lobbySockets.indexOf(socket);
		if (i >= 0) {
			lobbySockets.splice(i, 1);
			lobbyNames.splice(i, 1);
		}
	}

	function removePairFromLobby(challengerName, responderName) {
		var challengerIdx = lobbyNames.indexOf(challengerName);
		lobbySockets.splice(challengerIdx, 1);
		lobbyNames.splice(challengerIdx, 1);

		var responderIdx = lobbyNames.indexOf(responderName);
		lobbySockets.splice(responderIdx, 1);
		lobbyNames.splice(responderIdx, 1);
	}

	function updateLobbies(socket) {
		// To the person who just joined
		socket.emit("lobbyChange", {lobbyPlayerSet: lobbyNames});
		for (var idx = 0; idx < lobbySockets.length; idx++) {
			(lobbySockets[idx]).emit("lobbyChange", {lobbyPlayerSet: lobbyNames});
		}
	}

	// When new connection is initiated
	io.sockets.on('connection', function(socket){
		allClientSockets.push(socket);
		socket.on("joinedLobby", function(data) {
			allClients.push(data.screenname);
			// Keeping track of the actual socket itself
			// will be helpful later on when disconnect occurs
			lobbySockets.push(socket);
			lobbyNames.push(data.screenname);
			
			updateLobbies(socket);

		});
		socket.on('challenge', function(data) {
			var challenger = data.challenger;
			var responder = data.responder;

			// Get the socket of the responder by mapping from their name
			var i = allClients.indexOf(responder);
			var responderSocket = allClientSockets[i];
			// Get these two players out of the lobby
			removePairFromLobby(challenger, responder);
			// Record these two as being in a matchup
			matchupSockets.push([socket, responderSocket]);
			matchupNames.push([challenger, responder]);

			// Send everyone an update on the lobby
			updateLobbies(socket);

			socket.emit("awaitingResponse", {'opponent': responder});
			responderSocket.emit("giveResponse", {'opponent': challenger});
		});

		// We have ourselves a game
		socket.on("respondYes", function(data) {
			var responderSocket = socket;
			var challengerSocket = getOpponent(socket);
			
			var drawTime = Math.floor(Math.random()*3000) + 1000;

			responderSocket.emit("play", {'drawTime': drawTime});
			challengerSocket.emit("play", {'drawTime': drawTime});
		});

		socket.on("respondNo", function(data) {
			endMatchupAndBackToLobby(socket);
			updateLobbies(socket);
		});

		socket.on("hitMe", function(data) {
			if (getOpponent(socket)) {
				socket.emit("won", {"message": "<p>You were quick.  Can you do it again?</p>"});

				var opponent = getOpponent(socket);

				opponent.emit("lost", {"message": "<p>A bit too slow...practice more before facing this opponent again.</p>"});

				endMatchupAndBackToLobby(socket);
				updateLobbies(socket);
			}
		});

		//On disconnecting, decrement number of players
		socket.on('disconnect', function(){
			console.log("Someone disconnected");

			removeClient(socket);
			endMatchupAndBackToLobby(socket);
			// Found this little gadget from http://stackoverflow.com/questions/17287330/socket-io-handling-disconnect-event
			// This was how I thought of the idea of mapping the screen name to the socket itself
			removeFromLobby(socket);

			updateLobbies(socket);

		});
	});
}