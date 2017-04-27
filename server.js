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

// new connection
io.sockets.on('connection', function (socket) {
	// send all the players to the new player
	socket.emit('players', players)

	var newPlayer = {x: 32, y: 32, d: 'r'}
	players[socket.id] = newPlayer
	console.log('New player ', socket.id, ' Players: ' + countPlayers(players))

	// broadcast new player to other players
	var playersNew = {}
	playersNew[socket.id] = newPlayer
	socket.broadcast.emit('players', playersNew)

	// on position / activity update
	socket.on('p', function(playerUpdated) {
		// store new coordinates
		players[socket.id].x = playerUpdated.x
		players[socket.id].y = playerUpdated.y
		players[socket.id].a = playerUpdated.a
		
		// broadcast to other players
		socket.broadcast.emit('p', {n: socket.id, x: playerUpdated.x, y: playerUpdated.y, a: playerUpdated.a})
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