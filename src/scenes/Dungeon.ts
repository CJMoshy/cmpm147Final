import Phaser from "phaser"
import Player from "../prefabs/Player"

import test from '../assets/img/player-placeholder.png' //this will become player char
//import tileset from '../assets/tilemap/base_tileset.png'
import tileset from '../assets/tilemap/tile4-Sheet.png'
//import mapData from '../assets/tilemap/tileset-1.json'
import mapData from '../assets/tilemap/tile4-Sheet.json'

var NoiseNS = require("noisejs")

import { DUNGEON } from "../main"
import { TILECODES } from "../prefabs/generator"

//categorizing the codes here, for easy access during autotiling.
const walls = [TILECODES.WALL_W, TILECODES.WALL_E, TILECODES.WALL_F, TILECODES.WALL_A]
const hallways = [TILECODES.FLOOR_1, TILECODES.FLOOR_2, TILECODES.FLOOR_3, TILECODES.FLOOR_4]
const bgFloors = [TILECODES.BG_W, TILECODES.BG_E, TILECODES.BG_F, TILECODES.BG_A]
const transFloors = [TILECODES.FLOOR_1T, TILECODES.FLOOR_2T, TILECODES.FLOOR_3T, TILECODES.FLOOR_4T]
const specialFloors = [TILECODES.SPIKE_1, TILECODES.SPIKE_2, TILECODES.BRAZIER, TILECODES.ENTRANCE, TILECODES.EXIT]
const puddles = [TILECODES.WATER_TILE, TILECODES.WATER_DLR, TILECODES.WATER_ULR, TILECODES.WATER_UDL, TILECODES.WATER_UDR,
TILECODES.WATER_UL, TILECODES.WATER_UR, TILECODES.WATER_DR, TILECODES.WATER_DL,
TILECODES.WATER_D, TILECODES.WATER_U, TILECODES.WATER_L, TILECODES.WATER_R]
const pits = [TILECODES.PIT_TILE, TILECODES.PIT_DLR, TILECODES.PIT_ULR, TILECODES.PIT_UDL, TILECODES.PIT_UDR,
TILECODES.PIT_UL, TILECODES.PIT_UR, TILECODES.PIT_DR, TILECODES.PIT_DL,
TILECODES.PIT_D, TILECODES.PIT_U, TILECODES.PIT_L, TILECODES.PIT_R]


export default class DungeonScene extends Phaser.Scene {

    player: Phaser.Physics.Arcade.Sprite
    velocity: number
    TILESIZEMULTIPLIER: number
    exit: Phaser.Tilemaps.Tile

    constructor() {
        super({ key: 'DungeonScene' })

        this.TILESIZEMULTIPLIER = 64
    }

    init() { }

    preload() {

        console.log(DUNGEON.getRoomParsed())
        mapData.layers[0].data = DUNGEON.getRoomParsed()

        this.load.image('base-tileset', tileset)
        this.load.tilemapTiledJSON('tilemapJSON', mapData)

        //some filler asset here for player
        this.load.image('test', test)
    }

    create() {

        const map = this.add.tilemap('tilemapJSON')
        const tileset = map.addTilesetImage('dungeon_tileset', 'base-tileset')
        const bgLayer = map.createLayer('Background', tileset)
        const decoLayer = map.createBlankLayer("Decoration", tileset) //create the empty overlay layer
        const wallDecoLayer = map.createBlankLayer("WallDeco", tileset) //create the empty overlay layer for wall deco
        const wallDecoLayer2 = map.createBlankLayer("WallDeco2", tileset) //create the empty overlay layer for wall deco THIS IS FOR MULTI LAYERING
        bgLayer.setCollisionByProperty({ collides: true })
        const spawn = bgLayer.findTile((tile) => tile.properties.spawn === true)
        this.exit = bgLayer.findTile((tile) => tile.properties.exit === true)

        doOverlayTiles(this, map)

        console.log(this.exit.x, this.exit.y)
        console.log(TILECODES.EXIT)

        console.log(map.layers)



        //player
        this.player = new Player(this, spawn.x * this.TILESIZEMULTIPLIER, spawn.y * this.TILESIZEMULTIPLIER, 'test', 0)


        //camera
        this.cameras.main.startFollow(this.player, false, 0.5, 0.5, 0, 0)


        //collides with walls, traps , TODO: json parse
        this.physics.add.collider(this.player, bgLayer)


    }

    update(time: number, delta: number): void {

        //this is temporary until we have biger tiles and we can refine exit sizes
        if (Math.round(this.player.x) >= (this.exit.x * this.TILESIZEMULTIPLIER) - 32 && Math.round(this.player.x) <= (this.exit.x * this.TILESIZEMULTIPLIER) + 32 && this.player.y >= (this.exit.y * this.TILESIZEMULTIPLIER) - 32 && this.player.y <= (this.exit.y * this.TILESIZEMULTIPLIER) + 32) {
            //console.log('exit time')
            this.scene.start('IntermissionScene')
        }
        this.player.update()
    }
}

function doOverlayTiles(context: Phaser.Scene, map: Phaser.Tilemaps.Tilemap) {
    var overlayNoise = new NoiseNS.Noise(DUNGEON.getSeed())


    //here, we need to manually draw tiles based on autotiling results.
    // const asciiMap = DUNGEON.getRoom()
    // console.log("got ascii map")
    //map.setLayer("Decoration") //return to main
    function convertToOverlay(_tile: Phaser.Tilemaps.Tile) {
        //console.log(_tile)
        //console.log("looking at: ", _tile.x, _tile.y)
        //okay, so we need to look at: 
        //floor & hall tiles vs wall tiles
        //water tiles vs water tiles
        //pit tiles vs pit tiles

        let doDeco = false
        if (walls.includes(_tile.index)) { //add a variation of wall_null
            map.putTileAt(TILECODES.WALL_NULL, _tile.x, _tile.y, true, "Decoration")
            let c = map.getTileAt(_tile.x, _tile.y, true, "Decoration").setAlpha(Math.abs(overlayNoise.perlin2(_tile.x / 10, _tile.y / 10)) / 2 + 0.5)
        }
        if (hallways.includes(_tile.index) || (doDeco = (bgFloors.includes(_tile.index))) || specialFloors.includes(_tile.index)) {
            if (doDeco) {
                //console.log("in doDeco")
                //do transparent tile overlay here for regular floor tiles.
                //console.log("floor type:", DUNGEON.getFloorStyle())
                switch (DUNGEON.getFloorStyle()) {
                    case "W": //water: perlin flooring.
                        let indde = Math.floor(Math.abs(overlayNoise.perlin2(_tile.x / 10, _tile.y / 10)) * transFloors.length)
                        map.putTileAt(transFloors[indde], _tile.x, _tile.y, true, "Decoration")
                        break;
                    case "E": //earth: diagonal
                        let inddd = (_tile.x + _tile.y) % 4
                        map.putTileAt(transFloors[inddd], _tile.x, _tile.y, true, "Decoration")
                        break;
                    case "F": //fire: simple random flooring.
                        map.putTileAt(transFloors[Math.floor(Math.random() * transFloors.length)], _tile.x, _tile.y, true, "Decoration")
                        break;
                    case "A": //air: tiles
                        let group1 = (Math.floor(((_tile.x) % 8) / 2) + Math.floor(((_tile.y) % 8) / 2)) % 4
                        map.putTileAt(transFloors[group1], _tile.x, _tile.y, true, "Decoration")


                }
            }

            //do floor v wall checking here.
            checkVsWall(_tile, map)

        }
        else if (puddles.includes(_tile.index)) {

        } else if (pits.includes(_tile.index)) {

        }

    }

    map.forEachTile(convertToOverlay, context, 0, 0, 100, 100, null, "Background") //search each bg tile, and call the cb func.


}

function checkVsWall(_tile: Phaser.Tilemaps.Tile, map: Phaser.Tilemaps.Tilemap) {
    let code = getTileCode(_tile, walls, map)
    if (code == -1) { return }
    map.putTileAt(FLOOR_VS_WALL[code], _tile.x, _tile.y, false, "WallDeco")
    if (code == 3) {
        map.putTileAt(TILECODES.WALL_D, _tile.x, _tile.y, false, "WallDeco2")
    }
    else if (code == 12){
        map.putTileAt(TILECODES.WALL_R, _tile.x, _tile.y,false, "WallDeco2")
    }
}
function checkVsPuddle(_tile: Phaser.Tilemaps.Tile) {
}
function checkVsPit(_tile: Phaser.Tilemaps.Tile) {
}

const FLOOR_VS_WALL = [ //the tilecode of overlay wall tiles to place when comparing a floor tile to a wall tile.
    -1, // NO ADJACENT WALLS.
    TILECODES.WALL_U, //1 up
    TILECODES.WALL_D,  //2 down
    TILECODES.WALL_U,  //3 up and down //need to also place c2
    TILECODES.WALL_R,  //4 right
    TILECODES.WALL_UR,  //5 up and right
    TILECODES.WALL_DR,  //6 down and right
    TILECODES.WALL_UDR,  //7 up down and right 
    TILECODES.WALL_L,  //8 left
    TILECODES.WALL_UL,  //9 up and left
    TILECODES.WALL_DL,  //10 down and left
    TILECODES.WALL_UDL,  //11 up down and left 
    TILECODES.WALL_L,  //12 left and right  //also place c4
    TILECODES.WALL_ULR,  //13 up left and right
    TILECODES.WALL_DLR,  //14 down left and right 
    -1,  //15 surrounded just make it solid wall -- shouldn't exist? i think? idk.
]

function gridCheck(xpos: number, ypos: number, target: number[], map: Phaser.Tilemaps.Tilemap) {
    if (ypos < 0 || ypos >= map.height || xpos < 0 || xpos >= map.width) { return 0 }

    return target.includes(map.getTileAt(xpos, ypos, true, "Background").index) ? 1 : 0
}

function getTileCode(_tile: Phaser.Tilemaps.Tile, target: number[], map: Phaser.Tilemaps.Tilemap): number {
    let nb = gridCheck(_tile.x, _tile.y - 1, target, map) << 0 //1
    let sb = gridCheck(_tile.x, _tile.y + 1, target, map) << 1 //2
    let eb = gridCheck(_tile.x + 1, _tile.y, target, map) << 2 //4
    let wb = gridCheck(_tile.x - 1, _tile.y, target, map) << 3 //8
    let retVal = nb + sb + eb + wb
    //console.log(retVal)
    return retVal
}