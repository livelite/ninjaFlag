var express = require('express')

var app = express()

app.use(express.static(__dirname + '/client'))
app.use(express.static(__dirname + '/bower_components'))

var server = app.listen(8000, function() {
	console.log('listening on port 8000')
})

var io = require('socket.io').listen(server)

// holds information on all players
var players = {}

// flag holder
var flagHolder = ''

// new connection
io.sockets.on('connection', function (socket) {
	// send all the players to the new player
	socket.emit('players', players)
	socket.broadcast.emit('flagHolder', {flagHolder: flagHolder})

	var newPlayer = {x: 32, y: 300, d: 'r'}
	players[socket.id] = newPlayer
	console.log('New player ', socket.id, ' Players: ' + countPlayers(players))

	// broadcast new player to other players
	var playersNew = {}
	playersNew[socket.id] = newPlayer
	socket.broadcast.emit('players', playersNew)

	// on position / activity update
	socket.on('p', function(playerUpdated) {
		var playerUpdateSend = {n: socket.id, x: playerUpdated.x, y: playerUpdated.y, a: playerUpdated.a}
		// store new coordinates
		players[socket.id].a = playerUpdated.a
		if (playerUpdated.a == 'c') {
			players[socket.id].x = playerUpdated.x
			players[socket.id].y = playerUpdated.y
		}

		// broadcast to other players
		socket.broadcast.emit('p', playerUpdateSend)
	})

	// player got the flag
	socket.on('gotFlag', function() {
		flagHolder = socket.id

		// broadcast to all players
		io.emit('flagHolder', {flagHolder: flagHolder})
	})

	// on disconnect
	socket.on('disconnect', function() {
		delete players[socket.id]
		console.log('Disconnect ', socket.id, ' Players: ' + countPlayers(players))

		// broadcast player disconnect other players
		socket.broadcast.emit('disc', {n: socket.id})
	})
})

function countPlayers(players) {
	var size = 0, key;
	for (key in players) {
	    if (players.hasOwnProperty(key)) size++;
	}
	return size;
}