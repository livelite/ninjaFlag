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
	game.load.spritesheet('bullet', 'assets/rgblaser.png', 4, 4)
	game.load.audio('blaster', 'assets/turtle.mp3')
	game.load.tilemap('tilemap', 'assets/level.json', null, Phaser.Tilemap.TILED_JSON)
	game.load.image('tiles', 'assets/ninjaTiles.png')
	game.load.image('collision', 'assets/collision.png')
}

// hud
var scoreText

// layers
var collisionLayer

// sprites
var player
var players = {}
var playerGroup
var playersGroup
var stars
var weapon

// controls
var cursors
var fireButton

// sounds
var blaster

// game variables
var score = 0

// multiplayer
var socket

function create() {
	// A phaser plugin for Arcade Physics which allows going down slopes (like ninja physics)
	game.plugins.add(Phaser.Plugin.ArcadeSlopes)

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
	var ladderLayer = map.createLayer('LadderLayer')

	groundLayer.resizeWorld()

	map.setCollisionBetween(1, 1000, true, 'CollisionLayer')

	playerGroup = game.add.group()
	playersGroup = game.add.group()

	// The player and its settings
	player = playerGroup.create(32,32, 'dude')

	//  We need to enable physics on the player
	game.physics.arcade.enable(player)

	//  Player physics properties. Give the little guy a slight bounce.
	player.body.bounce.y = 0.2
	player.body.gravity.y = 300
	player.body.collideWorldBounds = true

	//  Our two animations, walking left and right.
	player.animations.add('left', [0, 1, 2, 3], 10, true)
	player.animations.add('right', [5, 6, 7, 8], 10, true)

	game.camera.follow(player)

	cursors = game.input.keyboard.createCursorKeys()
	fireButton = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR)

	stars = game.add.group()

	stars.enableBody = true;

	weapon = game.add.weapon(1, 'bullet')
	weapon.setBulletFrames(0, 80, true)
	weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS
	weapon.bulletSpeed = 400
	weapon.fireRate = 30
	weapon.fireAngle = Phaser.ANGLE_RIGHT
	weapon.trackSprite(player, 24, 35, false)

	//  Here we'll create 12 of them evenly spaced apart
	for (var i = 0; i < 12; i++) {
		//  Create a star inside of the 'stars' group
		var star = stars.create(i * 70, 0, 'star');

		//  Let gravity do its thing
		star.body.gravity.y = 6;

		//  This just gives each star a slightly random bounce value
		star.body.bounce.y = 0.7 + Math.random() * 0.2;
	}

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
				console.log('jump')
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
		}
	})

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

function update() {
	// collide with platform and other players
	game.physics.arcade.collide(playerGroup, collisionLayer)
	game.physics.arcade.collide(playersGroup, collisionLayer)
	var hitPlayer = game.physics.arcade.collide(playerGroup, playersGroup)

	// reset the player velocity (movement)
	player.body.velocity.x = 0

	if (cursors.left.isDown) {
		standSent = false
		broadcastPlayer('l')
		//  move to the left
		player.body.velocity.x = -200
		player.animations.play('left')
		weapon.fireAngle = Phaser.ANGLE_LEFT
		weapon.trackSprite(player, 0, 35, false)
	}
	else if (cursors.right.isDown) {
		standSent = false
		broadcastPlayer('r')
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
		if (!hitFloorSent) {
			broadcastPlayer('c')
			hitFloorSent = true
		}

		// allow the player to jump if they are touching the ground
		if (cursors.up.isDown) {
			broadcastPlayer('u')
			hitFloorSent = false
			player.body.velocity.y = -250
		}
	}

	// fire weapon
	if (fireButton.isDown) {
		if (!blaster.isPlaying)
			blaster.play()
		weapon.fire()
	}

	game.physics.arcade.collide(stars, collisionLayer);
	game.physics.arcade.overlap(player, stars, collectStar, null, this);
}

function collectStar (player, star) {

	// Removes the star from the screen
	star.kill();

	//  Add and update the score
	score += 10;
	scoreText.text = 'Score: ' + score;
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