import "mocha"
import { assert } from "chai"
import { setInfo, infoSymbol, getInfo, arrayMap, Info, stringMapMap, propertySetMap } from "./index"
import { Json } from '@ts-common/json';

describe("info", () => {
    it("array", () => {
        const x: string[] = []
        const xr = setInfo(x, { kind: "file", url: "/" })
        xr.push("3")
        xr.push("4")
        const info = xr[infoSymbol]
        assert.equal(info.kind, "file")
        const infoX = getInfo(xr)
        if (infoX === undefined) {
            throw new Error("infoX")
        }
        assert.equal(infoX.kind, "file")
    })
    it("arrayMap", () => {
        const a = ["aaa", "bb", "c"]
        const b = arrayMap(a, v => v)
        assert.strictEqual(a, b)
    })
    it("arrayMap", () => {
        const a = ["aaa", "bb", "c"]
        const info: Info =  { kind: "file", url: "/" }
        setInfo(a, info)
        const b = arrayMap(a, v => v + v)
        assert.deepEqual(["aaaaaa", "bbbb", "cc"], b)
        assert.strictEqual(info, getInfo(b))
    })
    it("arrayMapInfo", () => {
        const a = [["aaa", ""], ["bb"], ["c", "d"]]
        const info: Info = { kind: "file", url: "/" }
        const objectInfo: Info = { kind: "object", position: { line: 0, column: 0 }, parent: info, property: 0 }
        setInfo(a, info)
        setInfo(a[0], objectInfo)
        const b = arrayMap(a, v => [...v, ...v])
        assert.deepEqual([["aaa", "", "aaa", ""], ["bb", "bb"], ["c", "d", "c", "d"]], b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(b[0]))
    })
    it("arrayMapInfoAlt", () => {
        const a = [["aaa", ""], ["bb"], ["c", "d"]]
        const info: Info = { kind: "file", url: "/" }
        const altInfo: Info = { kind: "file", url: "/xxx.json" }
        const objectInfo: Info = { kind: "object", position: { line: 0, column: 0 }, parent: info, property: 0 }
        setInfo(a, info)
        setInfo(a[0], objectInfo)
        const b = arrayMap(a, v => {
            const result = [...v, ...v]
            setInfo(result, altInfo)
            return result
        })
        assert.deepEqual([["aaa", "", "aaa", ""], ["bb", "bb"], ["c", "d", "c", "d"]], b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(altInfo, getInfo(b[0]))
    })
    it("stringMap", () => {
        const a = { a: 2, b: 3 }
        const info: Info = { kind: "file", "url": "/" }
        setInfo(a, info)
        const x = stringMapMap(a, ([name, value]) => [name, value * value])
        assert.deepEqual({a: 4, b: 9}, x)
        assert.strictEqual(info, getInfo(x))
    })
    it("stringMapSame", () => {
        const a = { a: 2, b: 3 }
        const info: Info = { kind: "file", "url": "/" }
        setInfo(a, info)
        const x = stringMapMap(a, ([name, value]) => [name, value])
        assert.strictEqual(a, x)
        const infoX = getInfo(x)
        assert.strictEqual(info, infoX)
    })
    it("stringMapObject", () => {
        const a = { a: [2], b: [3] }
        const info: Info = { kind: "file", "url": "/" }
        const objectInfo: Info = {
            kind: "object",
            position: { line: 0, column: 0 },
            parent: info,
            property: 0
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const x = stringMapMap(a, ([name, value]) => [name, [value[0] * value[0]]])
        assert.deepEqual({a: [4], b: [9]}, x)
        assert.strictEqual(info, getInfo(x))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
})

describe("propertySetMap", () => {
    it("copy", () => {
        const a = { a: [2], b: "ok", c: 12 }
        const info: Info = { kind: "file", "url": "/" }
        const objectInfo: Info = {
            kind: "object",
            position: { line: 0, column: 0 },
            parent: info,
            property: 0
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {})
        assert.strictEqual(a, b)
    })
    it("change", () => {
        const a = { a: [2], b: "ok", c: 12 }
        const info: Info = { kind: "file", "url": "/" }
        const objectInfo: Info = {
            kind: "object",
            position: { line: 0, column: 0 },
            parent: info,
            property: 0
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {
            b: () => "ha ha"
        })
        assert.deepEqual({a: [2], b: "ha ha", c: 12 }, b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
    it("change object", () => {
        const a = { a: [2], b: "ok", c: 12 }
        const info: Info = { kind: "file", "url": "/" }
        const objectInfo: Info = {
            kind: "object",
            position: { line: 0, column: 0 },
            parent: info,
            property: 0
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {
            b: () => "ha ha",
            a: (k) => [k.length]
        })
        assert.deepEqual({a: [1], b: "ha ha", c: 12 }, b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
    it("add object", () => {
        const a: { a: {}, b: Json, c: Json, d?: string } = { a: [2], b: "ok", c: 12 }
        const info: Info = { kind: "file", "url": "/" }
        const objectInfo: Info = {
            kind: "object",
            position: { line: 0, column: 0 },
            parent: info,
            property: 0
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {
            b: () => "ha ha",
            a: (k) => [k.length],
            d: () => "some value"
        })
        assert.deepEqual({a: [1], b: "ha ha", c: 12, d: "some value" }, b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
})
