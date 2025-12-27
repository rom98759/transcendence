import { createNoise3D } from 'simplex-noise'
import Alea from 'alea'
import { Vector2 } from './game.vector.js'

interface Coordinate {
  x: number
  y: number
}

function map(
  value: number,
  valueMin: number,
  valueMax: number,
  mapMin: number,
  mapMax: number,
): number {
  return mapMin + ((value - valueMin) / (valueMax - valueMin)) * (mapMax - mapMin)
}

function angleDifference(a: number, b: number): number {
  let diff = b - a

  // Wrap to [-0.5, 0.5] range (shortest path around the circle)
  if (diff > 0.5) {
    diff -= 1
  } else if (diff < -0.5) {
    diff += 1
  }

  return diff
}

export class CosmicMicroWaveNoise {
  private noise3D: ReturnType<typeof createNoise3D>
  forceField: number[][]
  height: number
  width: number
  size: number

  constructor(w: number, h: number, size: number, seed: number = Date.now()) {
    const prng = Alea(seed)
    this.noise3D = createNoise3D(prng)
    this.width = w
    this.height = h
    this.size = size
    this.forceField = this.getField(w, h, size, 0)
  }

  getCoordAt(pixelX: number, pixelY: number): Coordinate | null {
    // Convert pixel position to grid coordinates
    const x = Math.floor(pixelX / this.size)
    const y = Math.floor(pixelY / this.size)

    // Bounds check
    const gridHeight = this.forceField.length
    const gridWidth = this.forceField[0]?.length || 0

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
      return null // Out of bounds
    }

    return { x, y }
  }

  update(time: number) {
    this.forceField = this.getField(this.width, this.height, this.size, time)
  }

  getNoiseAt(x: number, y: number): number | null {
    const coord = this.getCoordAt(x, y)
    if (!coord) return null
    return this.forceField[coord.y][coord.x]
  }

  setNoiseAt(x: number, y: number, value: number): boolean {
    const coord = this.getCoordAt(x, y)
    if (!coord) return false
    this.forceField[coord.y][coord.x] = value
    return true
  }

  addNoiseTo(coord: Coordinate, delta: number) {
    // Get fractional part of delta
    const fractionalDelta = ((delta % 1) + 1) % 1

    // Add and wrap result to [0, 1]
    this.forceField[coord.y][coord.x] =
      (((this.forceField[coord.y][coord.x] + fractionalDelta) % 1) + 1) % 1
  }

  distance(a: Coordinate, b: Coordinate): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  distanceSquared(a: Coordinate, b: Coordinate): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return dx * dx + dy * dy
  }

  reactFrom(pos: Vector2, spread: number, intensity: number): void {
    const x = pos.x
    const y = pos.y
    const spreading = spread * this.size // pixels
    const coord: Coordinate | null = this.getCoordAt(x, y)
    if (!coord) return

    for (let j = -spreading; j < spreading; j += this.size) {
      for (let i = -spreading; i < spreading; i += this.size) {
        const targetX = x + i
        const targetY = y + j
        const targetCoord: Coordinate | null = this.getCoordAt(targetX, targetY)
        if (!targetCoord) continue

        // ✅ Calculate distance in PIXELS, not grid coordinates
        const dx = targetX - x
        const dy = targetY - y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Now dist and spreading are both in pixels
        const diff = map(dist, 0, spread, intensity, 0)
        this.addNoiseTo(targetCoord, diff)
      }
    }
  }
  affectedFrom(pos: Vector2, spread: number, intensity: number): void {
    const x = pos.x
    const y = pos.y
    const spreadingPixels = spread * this.size
    const spreadingSquared = spreadingPixels * spreadingPixels

    const coord: Coordinate | null = this.getCoordAt(x, y)
    if (!coord) return

    const spreadingCells = Math.ceil(spreadingPixels / this.size)
    const gridHeight = this.forceField.length
    const gridWidth = this.forceField[0]?.length || 0

    for (let gridJ = -spreadingCells; gridJ <= spreadingCells; gridJ++) {
      for (let gridI = -spreadingCells; gridI <= spreadingCells; gridI++) {
        const targetX = coord.x + gridI
        const targetY = coord.y + gridJ

        if (targetX < 0 || targetX >= gridWidth || targetY < 0 || targetY >= gridHeight) {
          continue
        }

        const targetPixelX = targetX * this.size + this.size / 2
        const targetPixelY = targetY * this.size + this.size / 2

        const dx = targetPixelX - x
        const dy = targetPixelY - y
        const distSquared = dx * dx + dy * dy

        // Skip if outside radius (using squared distance - faster!)
        if (distSquared > spreadingSquared) continue

        // Calculate actual distance only when needed
        const dist = Math.sqrt(distSquared)
        const diff = map(dist, 0, spreadingPixels, intensity, 0)

        this.addNoiseTo({ x: targetX, y: targetY }, diff)
      }
    }
  }

  /**
   * Get a 2D force vector at a position
   * @param x - X position
   * @param y - Y position
   * @param scale - Noise scale (smaller = smoother, larger = more chaotic)
   * @param strength - Force magnitude multiplier
   * @param time - Time parameter for animation
   * @returns {x, y} force vector
   */
  getForceAt2D(x: number, y: number, scale: number, strength: number, time: number): Vector2 {
    // Sample noise at two different offsets to get independent x and y components
    const forceX = this.noise3D(x * scale, y * scale, time) * strength
    const forceY = this.noise3D(x * scale + 1000, y * scale + 1000, time) * strength

    const force = new Vector2(forceX, forceY)
    return force
  }

  /**
   * Alternative: Get force as angle-based vector (creates swirling patterns)
   */
  getForceAt2DSwirl(x: number, y: number, scale: number, strength: number, time: number): Vector2 {
    // Use noise to determine angle
    const angle = this.noise3D(x * scale, y * scale, time) * Math.PI * 2

    const force = new Vector2(Math.cos(angle) * strength, Math.sin(angle) * strength)
    return force
  }

  /**
   * Get curl noise (divergence-free, creates realistic fluid flow)
   */
  getForceAt2DCurl(
    x: number,
    y: number,
    scale: number,
    strength: number,
    time: number,
    epsilon: number = 0.01,
  ): Vector2 {
    // Sample noise at nearby points to compute curl
    const n1 = this.noise3D(x * scale, (y + epsilon) * scale, time)
    const n2 = this.noise3D(x * scale, (y - epsilon) * scale, time)
    const n3 = this.noise3D((x + epsilon) * scale, y * scale, time)
    const n4 = this.noise3D((x - epsilon) * scale, y * scale, time)

    // Curl is the perpendicular gradient
    const force = new Vector2(
      ((n1 - n2) / (2 * epsilon)) * strength,
      (-(n3 - n4) / (2 * epsilon)) * strength,
    )
    return force
  }

  updateRegion(
    time: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    scale: number = 0.005,
  ): void {
    const gridHeight = this.forceField.length
    const gridWidth = this.forceField[0].length

    const startGridX = Math.max(0, Math.floor(minX / this.size))
    const endGridX = Math.min(gridWidth - 1, Math.ceil(maxX / this.size))
    const startGridY = Math.max(0, Math.floor(minY / this.size))
    const endGridY = Math.min(gridHeight - 1, Math.ceil(maxY / this.size))

    for (let gridY = startGridY; gridY <= endGridY; gridY++) {
      for (let gridX = startGridX; gridX <= endGridX; gridX++) {
        const worldX = gridX * this.size * scale
        const worldY = gridY * this.size * scale

        const value = this.noise3D(worldX, worldY, time)
        this.forceField[gridY][gridX] = (value + 1) / 2
      }
    }
  }

  /**
   * Generate a 2D grid of noise values with custom pixel size
   * @param width - Total width in pixels
   * @param height - Total height in pixels
   * @param pixelSize - Size of each grid cell (e.g., 10 = one value per 10x10 pixels)
   * @param scale - Noise scale
   * @param time - Time parameter for animation
   * @param offsetX - X offset in world space (default: 0)
   * @param offsetY - Y offset in world space (default: 0)
   * @param normalize - If true, remap from [-1,1] to [0,1] (default: true)
   * @returns 2D array of noise values [y][x]
   */
  getField(
    width: number,
    height: number,
    pixelSize: number,
    time: number,
    scale: number = 0.005,
    offsetX: number = 0,
    offsetY: number = 0,
    normalize: boolean = true,
  ): number[][] {
    // Calculate grid dimensions
    const gridWidth = Math.ceil(width / pixelSize)
    const gridHeight = Math.ceil(height / pixelSize)

    const field: number[][] = []

    for (let gridY = 0; gridY < gridHeight; gridY++) {
      const row: number[] = []

      for (let gridX = 0; gridX < gridWidth; gridX++) {
        // Convert grid coordinates to world coordinates
        const worldX = (gridX * pixelSize + offsetX) * scale
        const worldY = (gridY * pixelSize + offsetY) * scale

        let value = this.noise3D(worldX, worldY, time)

        // Optionally normalize from [-1, 1] to [0, 1]
        if (normalize) {
          value = (value + 1) / 2
        }

        row.push(value)
      }
      field.push(row)
    }

    return field
  }

  getNoiseFrom(pos: Vector2): number | null {
    const coord = this.getCoordAt(pos.x, pos.y)

    if (!coord) return null

    return this.forceField[coord.y][coord.x]
  }

  getVectorAt(
    x: number,
    y: number,
    time: number,
    scale: number = 0.05,
    offsetX: number = 0,
    offsetY: number = 0,
  ): Vector2 {
    // const value = this.forceField[coord.y][coord.x];
    // Sample the noise
    const value = (this.noise3D((x + offsetX) * scale, (y + offsetY) * scale, time) + 1) / 2 // normalize to [0,1]
    //
    // Convert noise value -> angle
    const angle = value * Math.PI * 2 // 0..2π

    // Unit vector from angle
    const force = new Vector2(Math.cos(angle), Math.sin(angle))
    return force
  }
}
