import { schema } from 'battlecode-schema'
import {
    MapEditorBrush,
    MapEditorBrushField,
    MapEditorBrushFieldType,
    SymmetricMapEditorBrush
} from '../components/sidebar/map-editor/MapEditorBrush'
import Bodies from './Bodies'
import { CurrentMap, StaticMap } from './Map'
import { Vector } from './Vector'
import { Team } from './Game'
import Round from './Round'

const applyInRadius = (
    map: CurrentMap | StaticMap,
    x: number,
    y: number,
    radius: number,
    func: (idx: number) => void
) => {
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            if (Math.sqrt(i * i + j * j) <= radius) {
                const target_x = x + i
                const target_y = y + j
                if (target_x >= 0 && target_x < map.width && target_y >= 0 && target_y < map.height) {
                    const target_idx = map.locationToIndex(target_x, target_y)
                    func(target_idx)
                }
            }
        }
    }
}

const squareIntersects = (check: Vector, center: Vector, radius: number) => {
    return (
        check.x >= center.x - radius &&
        check.x <= center.x + radius &&
        check.y >= center.y - radius &&
        check.y <= center.y + radius
    )
}

const checkValidCheeseMinePlacement = (check: Vector, map: StaticMap, bodies: Bodies) => {
    // Check if cheese mine is too close to the border
    if (check.x <= 1 || check.x >= map.width - 2 || check.y <= 1 || check.y >= map.height - 2) {
        return false
    }

    // Check if this is a valid cheese mine location
    const idx = map.locationToIndex(check.x, check.y)
    const cheeseMine = map.cheeseMines.findIndex((l) => squareIntersects(l, check, 4))
    const wall = map.walls.findIndex((v, i) => !!v && squareIntersects(map.indexToLocation(i), check, 2))
    const dirt = map.initialDirt[idx]

    let tower = undefined
    for (const b of bodies.bodies.values()) {
        if (squareIntersects(check, b.pos, 4)) {
            tower = b
            break
        }
    }

    if (tower || cheeseMine !== -1 || wall !== -1 || dirt) {
        return false
    }

    return true
}

export class WallsBrush extends SymmetricMapEditorBrush<StaticMap> {
    private readonly bodies: Bodies
    public readonly name = 'Walls'
    public readonly fields = {
        shouldAdd: {
            type: MapEditorBrushFieldType.ADD_REMOVE,
            value: true
        },
        radius: {
            type: MapEditorBrushFieldType.POSITIVE_INTEGER,
            value: 1,
            label: 'Radius'
        }
    }

    constructor(round: Round) {
        super(round.map.staticMap)
        this.bodies = round.bodies
    }

    public symmetricApply(x: number, y: number, fields: Record<string, MapEditorBrushField>) {
        const add = (idx: number) => {
            // Check if this is a valid wall location
            const pos = this.map.indexToLocation(idx)
            const cheeseMine = this.map.cheeseMines.findIndex((l) => squareIntersects(l, pos, 2))
            const dirt = this.map.initialDirt[idx]

            let tower = undefined
            for (const b of this.bodies.bodies.values()) {
                if (squareIntersects(pos, b.pos, 2)) {
                    tower = b
                    break
                }
            }

            if (tower || cheeseMine !== -1 || dirt) return true

            this.map.walls[idx] = 1
        }

        const remove = (idx: number) => {
            this.map.walls[idx] = 0
        }

        const radius: number = fields.radius.value - 1
        const changes: { idx: number; prevValue: number }[] = []
        applyInRadius(this.map, x, y, radius, (idx) => {
            const prevValue = this.map.walls[idx]
            if (fields.shouldAdd.value) {
                if (add(idx)) return
                changes.push({ idx, prevValue })
            } else {
                remove(idx)
                changes.push({ idx, prevValue })
            }
        })

        return () => {
            changes.forEach(({ idx, prevValue }) => {
                this.map.walls[idx] = prevValue
            })
        }
    }
}

export class CheeseMinesBrush extends SymmetricMapEditorBrush<StaticMap> {
    private readonly bodies: Bodies
    public readonly name = 'Cheese Mines'
    public readonly fields = {
        shouldAdd: {
            type: MapEditorBrushFieldType.ADD_REMOVE,
            value: true
        }
    }

    constructor(round: Round) {
        super(round.map.staticMap)
        this.bodies = round.bodies
    }

    public symmetricApply(x: number, y: number, fields: Record<string, MapEditorBrushField>) {
        const add = (x: number, y: number) => {
            if (!checkValidCheeseMinePlacement({ x, y }, this.map, this.bodies)) {
                return true
            }

            this.map.cheeseMines.push({ x, y })
        }

        const remove = (x: number, y: number) => {
            const foundIdx = this.map.cheeseMines.findIndex((l) => l.x === x && l.y === y)
            if (foundIdx === -1) return true
            this.map.cheeseMines.splice(foundIdx, 1)
        }

        if (fields.shouldAdd.value) {
            if (add(x, y)) return null
            return () => remove(x, y)
        } else {
            if (remove(x, y)) return null
            return () => add(x, y)
        }
    }
}

export class DirtBrush extends SymmetricMapEditorBrush<CurrentMap> {
    private readonly bodies: Bodies
    public readonly name = 'Dirt'
    public readonly fields = {
        shouldAdd: {
            type: MapEditorBrushFieldType.ADD_REMOVE,
            value: true
        },
        team: {
            type: MapEditorBrushFieldType.TEAM,
            value: 0
        },
        radius: {
            type: MapEditorBrushFieldType.POSITIVE_INTEGER,
            value: 1,
            label: 'Radius'
        },
        paintType: {
            type: MapEditorBrushFieldType.SINGLE_SELECT,
            value: 0,
            label: 'Paint Type',
            options: [
                { value: 0, label: 'Primary' },
                { value: 1, label: 'Secondary' }
            ]
        }
    }

    constructor(round: Round) {
        super(round.map)
        this.bodies = round.bodies
    }

    public symmetricApply(x: number, y: number, fields: Record<string, MapEditorBrushField>, robotOne: boolean) {
        const add = (idx: number, value: number) => {
            // Check if this is a valid paint location
            const pos = this.map.indexToLocation(idx)
            const cheeseMine = this.map.staticMap.cheeseMines.find((r) => r.x === pos.x && r.y === pos.y)
            const wall = this.map.staticMap.walls[idx]
            const body = this.bodies.getBodyAtLocation(pos.x, pos.y)
            if (body || cheeseMine || wall) return true
            this.map.dirt[idx] = value
            this.map.staticMap.initialDirt[idx] = this.map.dirt[idx]
        }

        const remove = (idx: number) => {
            this.map.dirt[idx] = 0
            this.map.staticMap.initialDirt[idx] = 0
        }

        const radius: number = fields.radius.value - 1
        const changes: { idx: number; prevDirt: number }[] = []
        applyInRadius(this.map, x, y, radius, (idx) => {
            const prevDirt = this.map.dirt[idx]
            if (fields.shouldAdd.value) {
                let teamIdx = robotOne ? 0 : 1
                if (fields.team.value === 1) teamIdx = 1 - teamIdx
                const newVal = teamIdx * 2 + 1 + fields.paintType.value
                if (add(idx, newVal)) return
                changes.push({ idx, prevDirt })
            } else {
                remove(idx)
                changes.push({ idx, prevDirt })
            }
        })

        return () => {
            changes.forEach(({ idx, prevDirt }) => {
                this.map.dirt[idx] = prevDirt
                this.map.staticMap.initialDirt[idx] = prevDirt
            })
        }
    }
}

// export class TowerBrush extends SymmetricMapEditorBrush<StaticMap> {
//     private readonly bodies: Bodies
//     public readonly name = 'Towers'
//     public readonly fields = {
//         isTower: {
//             type: MapEditorBrushFieldType.ADD_REMOVE,
//             value: true
//         },
//         team: {
//             type: MapEditorBrushFieldType.TEAM,
//             value: 0
//         },
//         towerType: {
//             type: MapEditorBrushFieldType.SINGLE_SELECT,
//             value: schema.RobotType.,
//             label: 'Tower Type',
//             options: [
//                 { value: schema.RobotType.PAINT_TOWER, label: 'Paint Tower' },
//                 { value: schema.RobotType.MONEY_TOWER, label: 'Money Tower' }
//             ]
//         }
//     }

//     constructor(round: Round) {
//         super(round.map.staticMap)
//         this.bodies = round.bodies
//     }

//     public symmetricApply(x: number, y: number, fields: Record<string, MapEditorBrushField>, robotOne: boolean) {
//         const towerType: schema.RobotType = fields.towerType.value
//         const isTower: boolean = fields.isTower.value

//         const add = (x: number, y: number, team: Team) => {
//             const pos = { x, y }
//             if (!checkValidRuinPlacement(pos, this.map, this.bodies)) {
//                 return null
//             }

//             const id = this.bodies.getNextID()
//             this.bodies.spawnBodyFromValues(id, towerType, team, pos)

//             return id
//         }

//         const remove = (x: number, y: number) => {
//             const body = this.bodies.getBodyAtLocation(x, y)

//             if (!body) return null

//             const team = body.team
//             this.bodies.removeBody(body.id)

//             return team
//         }

//         if (isTower) {
//             let teamIdx = robotOne ? 0 : 1
//             if (fields.team.value === 1) teamIdx = 1 - teamIdx
//             const team = this.bodies.game.teams[teamIdx]
//             const id = add(x, y, team)
//             if (id) return () => this.bodies.removeBody(id)
//             return null
//         } else {
//             const team = remove(x, y)
//             if (!team) return null
//             return () => add(x, y, team)
//         }
//     }
// }
