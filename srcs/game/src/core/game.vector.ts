export class Vector2 {
  constructor(
    public x: number,
    public y: number,
  ) {}

  mult(scalar: number): this {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  add(v: Vector2): this {
    this.x += v.x
    this.y += v.y
    return this
  }

  limit(max: number): this {
    const len = this.length()
    if (len > max) {
      this.normalize().mult(max)
    }
    return this
  }

  normalize(): this {
    const len = this.length()
    if (len !== 0) {
      this.x /= len
      this.y /= len
    }
    return this
  }

  addVec(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y)
  }

  subVec(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y)
  }

  length(): number {
    return Math.hypot(this.x, this.y)
  }

  limitVec(max: number): Vector2 {
    const len = this.length()
    if (len > max) {
      // Normalize then scale to max length
      return this.normalizeVec().mult(max)
    }
    return new Vector2(this.x, this.y)
  }

  multVec(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }

  divVec(scalar: number) {
    if (scalar == 0) {
      return new Vector2(0, 0)
    }
    return new Vector2(this.x / scalar, this.y / scalar)
  }

  normalizeVec(): Vector2 {
    const len = this.length()
    return len === 0 ? new Vector2(0, 0) : new Vector2(this.x / len, this.y / len)
  }
}
