//Extracted from 2048 by gabrielecirulli
//https://github.com/gabrielecirulli/2048

var Grid = require('./grid.js').Grid;
var Tile = require('./tile.js').Tile;

function GameManager(size,startTiles,victory,gamestate ) {

    //Initialize game state
    this.setup(size,startTiles,victory,gamestate);
}

// Restart the game
GameManager.prototype.restart = function () {
  this.setup();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function (size,startTiles,victory,gamestate) {

  //Default game state
  if(gamestate == null) {
      this.size        = size; // Size of the grid
      this.startTiles   = startTiles;
      this.victory   = victory;
      this.grid        = new Grid(this.size);
      this.score       = 0;
      this.over        = false;
      this.won         = false;
  }
  else {
      this.size        = gamestate['size']; // Size of the grid
      this.startTiles   = gamestate['startTiles'];
      this.victory   = gamestate['victory'];
      this.grid        = new Grid(this.size,gamestate['grid']);
      this.score       = gamestate['score'];
      this.over        = gamestate['over'];
      this.won         = gamestate['won'];
  }

  // Add the initial tiles
  this.addStartTiles();

};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty victory tile (defaults to 2048)
          if (merged.value === self.victory) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

GameManager.prototype.serialize = function () {
    var gameObj = {};
    gameObj['grid']  =this.grid.getCells();
    gameObj['score']  =this.score;
    gameObj['over']  =this.over;
    gameObj['won']  =this.won;
    gameObj['size']  =this.size;
    gameObj['victory']  =this.victory;
    gameObj['startTiles']  =this.startTiles;
    console.log(gameObj);
    return gameObj;
};

GameManager.prototype.getState = function () {
    var obj = {};
    obj['grid'] = this.getGrid();
    obj['score'] = this.score;
    if(this.isGameTerminated()) {
        if(this.over) {
            obj['message'] = "Game Over!";
        }
        else if(this.won) {
            obj['message'] = "You Won!";
        }
    }
    return obj;
}

GameManager.prototype.getGrid = function () {
    var gridCells = this.grid.getCells();
    var normCells = [];

    for(var i in gridCells) {
        normCells[i] = [];
        for(var j in gridCells[i]) {
            if(gridCells[i][j] == null) {
                normCells[i][j] = 0;
            }
            else {
                normCells[i][j] = gridCells[i][j].value;
            }
        }
    }

    return normCells;
}

exports.GameManager = GameManager;
