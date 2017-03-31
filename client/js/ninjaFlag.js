var game = new Phaser.Game(800, 600, Phaser.AUTO, 'game', { preload: preload, create: create, update: update })

function preload() {
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
var platforms
var multiJump = 0
var score = 0
var scoreText
var fireButton

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
	backgroundLayer = map.createLayer('BackgroundLayer')
	groundLayer = map.createLayer('GroundLayer')
	ladderLayer = map.createLayer('LadderLayer')

	groundLayer.resizeWorld()

	map.setCollisionBetween(1, 1000, true, 'CollisionLayer')

	players = game.add.group();

	// The player and its settings
	player = players.create(32, 300, 'dude');
	player2 = players.create(96, 300, 'baddie');

	//  We need to enable physics on the player
	game.physics.arcade.enable(player);
	game.physics.arcade.enable(player2);		

	//  Player physics properties. Give the little guy a slight bounce.
	player.body.bounce.y = 0.3;
	player.body.gravity.y = 300;
	player.body.collideWorldBounds = true;
	player2.body.bounce.y = 0.4;
	player2.body.gravity.y = 300;
	player2.body.collideWorldBounds = true;


	//  Our two animations, walking left and right.
	player.animations.add('left', [0, 1, 2, 3], 10, true);
	player.animations.add('right', [5, 6, 7, 8], 10, true);
	player2.animations.add('left', [0, 1], 10, true);
	player2.animations.add('right', [2, 3], 10, true);

	game.camera.follow(player)

	cursors = game.input.keyboard.createCursorKeys();
	fireButton = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);

	stars = game.add.group();

	stars.enableBody = true;

	weapon = game.add.weapon(1, 'bullet')
	weapon.setBulletFrames(0, 80, true)
	weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS
	weapon.bulletSpeed = 400
	weapon.fireRate = 30
	weapon.fireAngle = Phaser.ANGLE_RIGHT
	weapon.trackSprite(player, 24, 35, false)

	//  Here we'll create 12 of them evenly spaced apart
	for (var i = 0; i < 12; i++)
	{
			//  Create a star inside of the 'stars' group
			var star = stars.create(i * 70, 0, 'star');

			//  Let gravity do its thing
			star.body.gravity.y = 6;

			//  This just gives each star a slightly random bounce value
			star.body.bounce.y = 0.7 + Math.random() * 0.2;
	}

	scoreText = game.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });
	scoreText.fixedToCamera = true

	blaster = game.add.audio('blaster')
	game.sound.setDecodedCallback([blaster], function(){}, this)
}

function update() {
	//  Collide the player and the stars with the platforms
	var hitPlatform = game.physics.arcade.collide(players, collisionLayer);
	var hitPlayer = game.physics.arcade.collide(player, player2);

	//  Reset the players velocity (movement)
	player.body.velocity.x = 0;

	if (cursors.left.isDown)
	{
			//  Move to the left
			player.body.velocity.x = -200;
			player.animations.play('left');
			weapon.fireAngle = Phaser.ANGLE_LEFT
			weapon.trackSprite(player, 0, 35, false)
	}
	else if (cursors.right.isDown)
	{
			//  Move to the right
			player.body.velocity.x = 200;
			player.animations.play('right');
			weapon.fireAngle = Phaser.ANGLE_RIGHT
			weapon.trackSprite(player, 24, 35, false)
	}
	else
	{
			//  Stand still
			player.animations.stop();
			player.frame = 4;
	}

	//  Allow the player to jump if they are touching the ground.  (player.body.touching.down && hitPlatform)
	if (cursors.up.isDown && (hitPlatform || multiJump < 10))
	{
			player.body.velocity.y = -250;
			multiJump++
	}

	//  Reset the players velocity (movement)
	player2.body.velocity.x = 0;

	if (cursors.left.isDown)
	{
			//  Move to the left
			player2.body.velocity.x = -200;

			player2.animations.play('left');
	}
	else if (cursors.right.isDown)
	{
			//  Move to the right
			player2.body.velocity.x = 200;

			player2.animations.play('right');
	}
	else
	{
			//  Stand still
			player2.animations.stop();
	}

	//  Allow the player to jump if they are touching the ground.  (player.body.touching.down && hitPlatform)
	if (cursors.up.isDown && (hitPlatform || multiJump < 10))
	{
			player2.body.velocity.y = -250;
			multiJump++
	}

	if (player2.body.touching.down && hitPlatform) {
		multiJump = 0
	}

	game.physics.arcade.collide(stars, collisionLayer);
	game.physics.arcade.overlap(player2, stars, collectStar, null, this);

	//  Allow the player to jump if they are touching the ground.  (player.body.touching.down && hitPlatform)
	if (cursors.up.isDown && (hitPlatform || multiJump < 10))
	{
			player.body.velocity.y = -250;
			multiJump++
	}

	if (player.body.touching.down && hitPlatform) {
		multiJump = 0
	}

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