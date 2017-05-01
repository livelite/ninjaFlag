var game = new Phaser.Game(800, 600, Phaser.AUTO, 'game', { preload: preload, create: create, update: update })

function preload() {
	// don't pause the game when losing focus
	game.stage.disableVisibilityChange = true

	game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL
	if (game.device.desktop) {
		game.scale.maxWidth = 1000
		game.scale.maxHeight = 800
	} else {
		game.scale.maxWidth = 1000
		game.scale.maxHeight = 800
	}
	game.scale.pageAlignHorizontally = true
	game.scale.pageAlignVertically = true
	game.stage.smoothed = false
	game.load.image('sky', 'assets/sky.png')
	game.load.image('ground', 'assets/platform.png')
	game.load.image('star', 'assets/star.png')
	game.load.spritesheet('dude', 'assets/dude.png', 32, 48)
	game.load.spritesheet('baddie', 'assets/baddie.png', 32, 32)
	game.load.spritesheet('flag', 'assets/flag.png', 24, 28)
	game.load.spritesheet('bullet', 'assets/rgblaser.png', 4, 4)
	game.load.audio('blaster', 'assets/turtle.mp3')
	game.load.tilemap('tilemap', 'assets/ninja3.json', null, Phaser.Tilemap.TILED_JSON)
	game.load.image('tiles', 'assets/ninjaTiles.png')
	game.load.image('collision', 'assets/collision.png')
}

// hud
var scoreText

// layers
var collisionLayer
var ladderLayer

// sprites
var player
var players = {}
var playerGroup
var playersGroup
var weapon
var items

// items
var flag

// controls
var cursors
var fireButton

// sounds
var blaster

// game variables
var score = 0

// multiplayer
var socket
var flagHolder = ''

// objects
var flagDrop
var flagSpawn
var playerSpawn

function create() {
	// A phaser plugin for Arcade Physics which allows going down slopes (like ninja physics)
	// game.plugins.add(Phaser.Plugin.ArcadeSlopes)

	//  We're going to be using physics, so enable the Arcade Physics system
	game.physics.startSystem(Phaser.Physics.ARCADE);

	//  A simple background for our game
	game.stage.backgroundColor = "#a9f0ff";
	var background = game.add.tileSprite(0, 0, 800, 600, 'sky');
	background.fixedToCamera = true

	var map = game.add.tilemap('tilemap')
	map.addTilesetImage('collision', 'collision')	
	map.addTilesetImage('ninjaTileset', 'tiles')	

	collisionLayer = map.createLayer('CollisionLayer')
	collisionLayer.visible = false
	var backgroundLayer = map.createLayer('BackgroundLayer')
	var groundLayer = map.createLayer('GroundLayer')
	ladderLayer = map.createLayer('LadderLayer')



	if (map.objects.Objects) {
		const objects = map.objects.Objects
		for (var object in objects) {
			if(objects[object].name == 'flagDrop')
				flagDrop = objects[object]
			if(objects[object].name == 'flagSpawn')
				flagSpawn = objects[object]
			if(objects[object].name == 'playerSpawn')
				playerSpawn = objects[object]
		}
	}

	groundLayer.resizeWorld()

	map.setCollisionBetween(1, 1000, true, 'CollisionLayer')

	// add the flag
	items = game.add.group()
	items.enableBody = true
	flag = items.create(flagSpawn.x, flagSpawn.y, 'flag')
	flag.body.bounce.y = 0.4
	flag.body.gravity.y = 200
	flag.body.collideWorldBounds = true

	playerGroup = game.add.group()
	playersGroup = game.add.group()

	// The player and its settings
	player = playerGroup.create(playerSpawn.x, playerSpawn.y, 'dude')

	//  We need to enable physics on the player
	game.physics.arcade.enable(player)

	//  Player physics properties. Give the little guy a slight bounce.
	player.body.bounce.y = 0.2
	player.body.gravity.y = 300
	player.body.collideWorldBounds = true

	//  Our two animations, walking left and right.
	player.animations.add('left', [0, 1, 2, 3], 10, true)
	player.animations.add('right', [5, 6, 7, 8], 10, true)

	// camera follow player around the screen
	game.camera.follow(player)

	// controls
	cursors = game.input.keyboard.createCursorKeys()
	fireButton = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

	weapon = game.add.weapon(1, 'bullet')
	weapon.setBulletFrames(0, 80, true)
	weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS
	weapon.bulletSpeed = 400
	weapon.fireRate = 30
	weapon.fireAngle = Phaser.ANGLE_RIGHT
	weapon.trackSprite(player, 24, 35, false)

	scoreText = game.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' })
	scoreText.fixedToCamera = true

	blaster = game.add.audio('blaster')
	game.sound.setDecodedCallback([blaster], function(){}, this)

	// connect to server
	socket = io.connect()

	// create and update other players
	socket.on('players', function(playersUpdate) {
		for (var player in playersUpdate) {
			if (player in players) {
				// update player
				players[player].body.x = playersUpdate[player].x
				players[player].body.y = playersUpdate[player].y
			} else {
				// add a new player
				newPlayer = playersGroup.create(playersUpdate[player].x, playersUpdate[player].y, 'dude')
				game.physics.arcade.enable(newPlayer)
				newPlayer.body.bounce.y = 0.2
				newPlayer.body.gravity.y = 300
				newPlayer.body.collideWorldBounds = true
				newPlayer.animations.add('left', [0, 1, 2, 3], 10, true)
				newPlayer.animations.add('right', [5, 6, 7, 8], 10, true)
				newPlayer.frame = 4
				newPlayer.actual = {}
				players[player] = newPlayer
			}
		}
	})

	// update player position
	// socket.on('p', function(playerUpdate) {
	// 	if (playerUpdate.n in players) {
	// 		players[playerUpdate.n].x = playerUpdate.x
	// 		players[playerUpdate.n].y = playerUpdate.y
	// 		// if (playerUpdate.d == 'l') {

	// 		// }
	// 	}
	// })

	// update player position
	socket.on('p', function(playerUpdate) {
		if (playerUpdate.n in players) {
			//  Reset the player velocity (movement)
			players[playerUpdate.n].body.velocity.x = 0

			if (playerUpdate.a == 'r') {
				// move right
				players[playerUpdate.n].body.velocity.x = 200
				players[playerUpdate.n].animations.play('right')
			} else if (playerUpdate.a == 'l') {
				// move left
				players[playerUpdate.n].body.velocity.x = -200
				players[playerUpdate.n].animations.play('left')
			} else if (playerUpdate.a == 'u') {
				// jump up
				players[playerUpdate.n].body.velocity.y = -250
			} else if (playerUpdate.a == 's') {
				// stand still
				players[playerUpdate.n].animations.stop();
				players[playerUpdate.n].frame = 4
			} else if (playerUpdate.a == 'c') {
				// coordinate update
				players[playerUpdate.n].x = playerUpdate.x
				players[playerUpdate.n].y = playerUpdate.y
			}

			// compensate for lag inaccuracies
			if (Math.abs(playerUpdate.x - players[playerUpdate.n].x) > 5) {
				players[playerUpdate.n].x = playerUpdate.x
			}
			if (Math.abs(playerUpdate.x - players[playerUpdate.n].y) > 10) {
				players[playerUpdate.n].x = playerUpdate.x
			}	
		}
	})

	// there is a new flag holder
	socket.on('flagHolder', function(playerUpdate) {
		flagHolder = playerUpdate.flagHolder
		if (flagHolder == socket.io.engine.id) {
			// current user has the flag

		} else { // another player has the flag

			gotFlag = false
		}
	})

	// score flag return
	if (Math.abs(player.body.x - flagDrop.x) < 10 && Math.abs(player.body.y - flagDrop.y) < 20) {
		// update the score
		score += 1
		scoreText.text = 'Score: ' + score

		// reset player location
		player.body.x = playerSpawn.x
		player.body.y = playerSpawn.y

		// reset flag location
		flag.body.x = flagDrop.x
		flag.body.y = flagDrop.y
	}

	// on player disconnect
	socket.on('disc', function(playerDisconnected) {
		// remove player from the screen
		if (playerDisconnected.n in players) {
			players[playerDisconnected.n].kill()
			delete players[playerDisconnected.n]
		}
	})
}

// if no button is pressed, send one stand command
var standSent = false

// send a coordinate update upon hitting the floor
var hitFloorSent = false

// send less data
var leftSent = false
var rightSent = false

function update() {
	// collide with platform and other players
	game.physics.arcade.collide(playerGroup, collisionLayer)
	game.physics.arcade.collide(playersGroup, collisionLayer)
	var hitPlayer = game.physics.arcade.collide(playerGroup, playersGroup)

	game.physics.arcade.collide(items, collisionLayer)
	game.physics.arcade.overlap(player, items, gotItem, null, this)

	// game.physics.arcade.collide(stars, collisionLayer)
	// game.physics.arcade.overlap(player, stars, collectStar, null, this)

	// ladder overlap
	// var onLadder = game.physics.arcade.collide(playerGroup, collisionLayer)
	// console.log(onLadder)
	// if (onLadder) {
	// 	console.log('on ladder')
	// 	player.body.moves = false
	// } else {
	// 	console.log('off ladder')
	// 	player.body.moves = true
	// }

	// flag follows flagHolder
	if (flagHolder == socket.io.engine.id) {
		// current user has the flag
		flag.body.x = player.body.x
		flag.body.y = player.body.y - 16

	} else { // another player has the flag

		if (players[flagHolder]) {
			flag.body.x = players[flagHolder].body.x
			flag.body.y = players[flagHolder].body.y - 16
		}
	}

	// reset the player velocity (movement)
	player.body.velocity.x = 0

	if (cursors.left.isDown) {
		standSent = false
		rightSent = false

		// broadcast every other left when held down
		leftSent = !leftSent
		if (leftSent) {
			broadcastPlayer('l')
		}
		
		//  move to the left
		player.body.velocity.x = -200
		player.animations.play('left')
		weapon.fireAngle = Phaser.ANGLE_LEFT
		weapon.trackSprite(player, 0, 35, false)
	}
	else if (cursors.right.isDown) {
		standSent = false
		leftSent = false
		// broadcast every other left when held down
		rightSent = !rightSent
		if (rightSent) {
			broadcastPlayer('r')
		}
		
		//  move to the right
		player.body.velocity.x = 200
		player.animations.play('right')
		weapon.fireAngle = Phaser.ANGLE_RIGHT
		weapon.trackSprite(player, 24, 35, false)
	}
	else {
		//  stand still
		if (!standSent) {
			// if no button is pressed, send stand command once
			broadcastPlayer('s')
			standSent = true
		}
		player.animations.stop();
		player.frame = 4
	}

	if (player.body.onFloor() || hitPlayer) {
		// send a coordinate update upon hitting the floor
		standSent = false
		if (!hitFloorSent) {
			broadcastPlayer('c')
			hitFloorSent = true
		}

		// allow the player to jump if they are touching the ground
		if (cursors.up.isDown) {
			standSent = false
			broadcastPlayer('u')
			hitFloorSent = false
			player.body.velocity.y = -250
		}
	}

	// fire weapon
	if (fireButton.isDown) {
		standSent = false
		if (!blaster.isPlaying)
			blaster.play()
		weapon.fire()
	}
}

var gotFlag = false

function gotItem(player, item) {
	//console.log('got item')
	// player got the item
	//item.kill()
	if (!gotFlag) {
		socket.emit('gotFlag')
		gotFlag = true
	}
	// else {
	// 	console.log('got something else')
	// }

	//  Add and update the score
	// score += 10
	// scoreText.text = 'Score: ' + score
}

function broadcastPlayer(action) {
	var playerUpdated = {
		x: parseInt(player.body.x),
		y: parseInt(player.body.y),
		a: action
	}

	// emit player update
	socket.emit('p', playerUpdated)
}