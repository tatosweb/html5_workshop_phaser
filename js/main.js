PlayState = {};

// loading game assets
PlayState.preload = function() {
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');
    this.game.load.image('hero', 'images/hero_stopped.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');
    
    // level settings
    this.game.load.json('level:1', 'data/level01.json');

    //sounds
    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');

    // spritesheet
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22); // 22,22 are the size in pixels of the individual frame
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
};

// create game entities and set up the world
PlayState.create = function() {
    this.game.add.image(0, 0, 'background');
    this._loadLevel(this.game.cache.getJSON('level:1'));
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin')
    };
};

PlayState._loadLevel = function (data){
    // groups layers
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false; // invisible walls

    data.platforms.forEach(this._spawnPlatform, this);
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // spawn coins
    data.coins.forEach(this._spawnCoin, this);

    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;

};

// spawn the platforms
PlayState._spawnPlatform = function(platform){
    //this.game.add.sprite(platform.x, platform.y, platform.image);
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // add invisible walls
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnCharacters = function (data) {
    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);

    // spawn spiders
    data.spiders.forEach(function(spider){
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);
};

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    // animate
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps loop = true
    sprite.animations.play('rotate');

    // set physics
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

// set controls
PlayState.init = function(){
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    this.game.renderer.renderSession.roundPixels = true;
};

// Hero class
function Hero(game, x, y) {
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');
    this.anchor.set(0.5, 0.5);
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

// moves for hero
Hero.prototype.move = function(direction){
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
};

Hero.prototype.jump = function(){
    const JUMP_SPEED = 600;
    let canJump = this.body.touching.down;

    if (canJump) {
        this.body.velocity.y = -JUMP_SPEED;
    }

    return canJump;
};

// spider class
function Spider(game, x ,y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');

    // physics properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

// inherit fron phaser sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};


PlayState.update = function(){
    this._handleCollisions();
    this._handleInput();
};

PlayState._handleInput = function(){
    if (this.keys.left.isDown) {
        this.hero.move(-1);
    }else if (this.keys.right.isDown) {
        this.hero.move(1);
    }else{
        this.hero.move(0);
    }

    this.keys.up.onDown.add(function(){
        let didJump = this.hero.jump();
        if (didJump) {
            this.sfx.jump.play();
        }
    }, this);
};

PlayState._handleCollisions = function(){
    this.game.physics.arcade.collide(this.hero, this.platforms);

    // get coins
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this); // the null is for the filter to exclude elements to don't apply the overlaping

    // spiders collition with platforms
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    // spider colitions with invisible walls
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
};

PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
};

window.onload = () => {
    const game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');

    game.state.add('play', PlayState);
    game.state.start('play');
};
