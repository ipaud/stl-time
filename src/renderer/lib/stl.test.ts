import { describe, expect, test } from 'vitest'
import { InvalidStlError, loadStl } from './stl.js'

/** Minimal binary STL writer, so the test owns its own fixture bytes. */
function binaryStlCube(side: number): ArrayBuffer {
  const v: [number, number, number][] = [
    [0, 0, 0],
    [side, 0, 0],
    [side, side, 0],
    [0, side, 0],
    [0, 0, side],
    [side, 0, side],
    [side, side, side],
    [0, side, side],
  ]
  const faces = [
    [0, 3, 2],
    [0, 2, 1],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [1, 2, 6],
    [1, 6, 5],
    [2, 3, 7],
    [2, 7, 6],
    [3, 0, 4],
    [3, 4, 7],
  ]

  const buffer = new ArrayBuffer(84 + faces.length * 50)
  const view = new DataView(buffer)
  view.setUint32(80, faces.length, true)

  faces.forEach((face, index) => {
    let offset = 84 + index * 50 + 12 // skip the normal
    for (const vertexIndex of face) {
      const vertex = v[vertexIndex]!
      for (const component of vertex) {
        view.setFloat32(offset, component, true)
        offset += 4
      }
    }
  })

  return buffer
}

describe('loadStl', () => {
  test('reads dimensions, triangle count, volume and area from a cube', () => {
    const { analysis } = loadStl(binaryStlCube(20), 'cube.stl', 684)

    expect(analysis.triangleCount).toBe(12)
    expect(analysis.dimensions).toEqual({ x: 20, y: 20, z: 20 })
    expect(analysis.volumeMm3).toBeCloseTo(8000, 1)
    expect(analysis.surfaceAreaMm2).toBeCloseTo(2400, 1)
    expect(analysis.fitsPrinter).toBe(true)
  })

  test('flags a model that does not fit the build volume', () => {
    const { analysis } = loadStl(binaryStlCube(240), 'big.stl', 684)
    expect(analysis.fitsPrinter).toBe(false)
  })

  test('rejects a file that is not an STL', () => {
    const junk = new TextEncoder().encode('this is not an stl at all, not even close')
    expect(() => loadStl(junk.buffer as ArrayBuffer, 'x.stl', 42)).toThrow(InvalidStlError)
  })

  test('rejects an STL with no triangles', () => {
    const empty = new ArrayBuffer(84)
    new DataView(empty).setUint32(80, 0, true)
    expect(() => loadStl(empty, 'empty.stl', 84)).toThrow(InvalidStlError)
  })
})
