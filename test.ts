import "mocha"
import { assert } from "chai"
import {
    setInfo,
    objectInfoSymbol,
    getInfo,
    arrayMap,
    ObjectInfo,
    stringMapMap,
    propertySetMap,
    stringMapMerge,
    ChildObjectInfo,
    RootObjectInfo,
    getRootObjectInfo,
    getPath,
    createRootObjectInfo,
    createChildObjectInfo,
    TrackedBase,
    cloneDeep,
    Data,
    getDescendantFilePosition,
    FilePosition,
    getAllDirectives,
    getInfoFunc,
    cloneDeepWithInfo
} from "./index"
import { Json } from '@ts-common/json'
import { StringMap } from '@ts-common/string-map'

describe("info", () => {
    it("array", () => {
        const x: string[] = []
        const xr = setInfo(x, createRootObjectInfo({ line: 0, column: 1 }, "/", {}))
        xr.push("3")
        xr.push("4")
        const info = xr[objectInfoSymbol]()
        assert.isFalse(info.isChild)
        const infoX = getInfo(xr)
        if (infoX === undefined) {
            throw new Error("infoX")
        }
        assert.isFalse(infoX.isChild)
    })
    it("undefined", () => {
        const infoX = getInfo(undefined)
        assert.isUndefined(infoX)
    })
})

describe("getInfo", () => {
    it("no info", () => {
        const result = getInfo({})
        assert.isUndefined(result)
    })
})

describe("getInfoFunc", () => {
    it("undefined", () => {
        const result = getInfoFunc(undefined)
        assert.isUndefined(result)
    })
})

describe("arrayMap", () => {
    it("arrayMap", () => {
        const a = ["aaa", "bb", "c"]
        const b = arrayMap(a, v => v)
        assert.strictEqual(a, b)
    })
    it("arrayMap", () => {
        const a = ["aaa", "bb", "c"]
        const info: ObjectInfo = createRootObjectInfo({ line: 0, column: 1 }, "/", {})
        setInfo(a, info)
        const b = arrayMap(a, v => v + v)
        assert.deepEqual(["aaaaaa", "bbbb", "cc"], b)
        assert.strictEqual(info, getInfo(b))
    })
    it("arrayMapInfo", () => {
        const a = [["aaa", ""], ["bb"], ["c", "d"]]
        const info: ObjectInfo = createRootObjectInfo({ line: 0, column: 2 }, "/", {})
        const x: TrackedBase = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = createChildObjectInfo({ line: 0, column: 0 }, x, 0, {})
        setInfo(a, info)
        setInfo(a[0], objectInfo)
        const b = arrayMap(a, v => [...v, ...v])
        assert.deepEqual([["aaa", "", "aaa", ""], ["bb", "bb"], ["c", "d", "c", "d"]], b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(b[0]))
    })
    it("arrayMapInfoAlt", () => {
        const a = [["aaa", ""], ["bb"], ["c", "d"]]
        const info: ObjectInfo = { isChild: false, url: "/", position: { line: 3, column: 5 }, primitiveProperties: {} }
        const altInfo: ObjectInfo = { isChild: false, url: "/xxx.json", position: { line: 7, column: 8 }, primitiveProperties: {} }
        const alt: TrackedBase = { [objectInfoSymbol]: () => altInfo }
        const objectInfo: ObjectInfo = { isChild: true, position: { line: 0, column: 0 }, parent: alt, property: 0, primitiveProperties: {} }
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
    it("undefined", () => {
        const result = arrayMap(undefined, _ => _)
        assert.deepEqual(result, [])
    })
})

describe("stringMap", () => {
    it("stringMap", () => {
        const a = { a: 2, b: 3 }
        const info: ObjectInfo = { isChild: false, url: "/", position: { line: 5, column: 7 }, primitiveProperties: {} }
        setInfo(a, info)
        const x = stringMapMap(a, value => value * value)
        assert.deepEqual({a: 4, b: 9}, x)
        assert.strictEqual(info, getInfo(x))
    })
    it("stringMapSame", () => {
        const a = { a: 2, b: 3 }
        const info: ObjectInfo = { isChild: false, url: "/", position: { line: 8, column: 0 }, primitiveProperties: {} }
        setInfo(a, info)
        const x = stringMapMap(a, value => value)
        assert.strictEqual(a, x)
        const infoX = getInfo(x)
        assert.strictEqual(info, infoX)
    })
    it("stringMapObject", () => {
        const a = { a: [2], b: [3] }
        const info: ObjectInfo = { isChild: false, url: "/", position: { line: 9, column: 67 }, primitiveProperties: {} }
        const root: TrackedBase = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = {
            isChild: true,
            position: { line: 0, column: 0 },
            parent: root,
            property: 0,
            primitiveProperties: {}
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const x = stringMapMap(a, value => [value[0] * value[0]])
        assert.deepEqual({a: [4], b: [9]}, x)
        assert.strictEqual(info, getInfo(x))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
    it("undefined", () => {
        const u: undefined | StringMap<number> = undefined
        const x = stringMapMap(u, (value: number) => value * value)
        assert.deepEqual({}, x)
    })
})

describe("stringMapMerge", () => {
    it("merge", () => {
        const a = { a: 2, b: 3 }
        const b = { c: 4, d: -99.01 }
        const info: ObjectInfo = { isChild: false, url: "/", position: { line: 0, column: 0 }, primitiveProperties: {}}
        setInfo(a, info)
        const result = stringMapMerge(a, b)
        assert.deepEqual({ a: 2, b: 3, c: 4, d: -99.01 }, result)
        assert.strictEqual(info, getInfo(result))
    })
    it("nothing to merge", () => {
        const a = { a: 2, b: 3 }
        const b = {}
        const info: ObjectInfo = { isChild: false, "url": "/", position: { line: 0, column: 0 }, primitiveProperties: {} }
        setInfo(a, info)
        const result = stringMapMerge(a, b)
        assert.strictEqual(a, result)
    })
    it("no inputs", () => {
        const result = stringMapMerge()
        assert.deepEqual({}, result)
    })
    it("undefined source", () => {
        const result = stringMapMerge(undefined, { a: 5 })
        assert.deepEqual({ a: 5 }, result)
    })
})

describe("propertySetMap", () => {
    it("copy", () => {
        const a = { a: [2], b: "ok", c: 12 }
        const info: ObjectInfo = { isChild: false, "url": "/", position: { line: 0, column: 0 }, primitiveProperties: {} }
        const root: TrackedBase = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = {
            isChild: true,
            position: { line: 0, column: 0 },
            parent: root,
            property: 0,
            primitiveProperties: {}
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {})
        assert.strictEqual(a, b)
    })
    it("change", () => {
        const a = { a: [2], b: "ok", c: 12 }
        const info: ObjectInfo = { isChild: false, "url": "/", position: { line: 0, column: 0 }, primitiveProperties: {} }
        const root: TrackedBase = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = {
            isChild: true,
            position: { line: 0, column: 0 },
            parent: root,
            property: 0,
            primitiveProperties: {}
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
        const info: ObjectInfo = { isChild: false, "url": "/", position: { line: 0, column: 0 }, primitiveProperties: {} }
        const root = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = {
            isChild: true,
            position: { line: 0, column: 0 },
            parent: root,
            property: 0,
            primitiveProperties: {}
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {
            b: () => "ha ha",
            a: ({}, k: "a") => [k.length]
        })
        assert.deepEqual({a: [1], b: "ha ha", c: 12 }, b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
    it("add object", () => {
        const a: { a: {}, b: Json, c: Json, d?: string } = { a: [2], b: "ok", c: 12 }
        const info: ObjectInfo = { isChild: false, "url": "/", position: { line: 0, column: 0 }, primitiveProperties: {} }
        const root = { [objectInfoSymbol]: () => info }
        const objectInfo: ObjectInfo = {
            isChild: true,
            position: { line: 0, column: 0 },
            parent: root,
            property: 0,
            primitiveProperties: {}
        }
        setInfo(a, info)
        setInfo(a.a, objectInfo)
        const b = propertySetMap(a, {
            b: () => "ha ha",
            a: (_: {}, k: "a") => [k.length],
            d: () => "some value"
        })
        assert.deepEqual({a: [1], b: "ha ha", c: 12, d: "some value" }, b)
        assert.strictEqual(info, getInfo(b))
        assert.strictEqual(objectInfo, getInfo(a.a))
    })
})

describe("getRootObjectInfo", () => {
    it("from object", () => {
        const f: RootObjectInfo = { isChild: false, url: "url", position: { line: 0, column: 1 }, primitiveProperties: {} }
        const root = { [objectInfoSymbol]: () => f }
        const a: ObjectInfo = { isChild: true, position: { line: 1, column: 1 }, parent: root, property: 0, primitiveProperties: {} }
        const r = getRootObjectInfo(a)
        assert.strictEqual(f, r)
    })
})

describe("getPath", () => {
    it("from object", () => {
        const f: ObjectInfo = { isChild: false, url: "url", position: { line: 1, column: 1 }, primitiveProperties: {} }
        const root = { [objectInfoSymbol]: () => f }
        const a: ObjectInfo = { isChild: true, position: { line: 1, column: 1 }, parent: root, property: 0, primitiveProperties: {} }
        const r = getPath(a)
        assert.deepEqual([0], r)
    })
    it("from file", () => {
        const f: RootObjectInfo = { isChild: false, url: "url", position: { line: 1, column: 1 }, primitiveProperties: {} }
        const r = getPath(f)
        assert.deepEqual([], r)
    })
    it("from nested object", () => {
        const f: RootObjectInfo = { isChild: false, url: "url", position: { line: 1, column: 1 }, primitiveProperties: {} }
        const fo = { [objectInfoSymbol]: () => f }
        const a: ObjectInfo = { isChild: true, position: { line: 1, column: 1 }, parent: fo, property: 0, primitiveProperties: {} }
        const ao = { [objectInfoSymbol]: () => a }
        const b: ObjectInfo = { isChild: true, position: { line: 1, column: 1 }, parent: ao, property: "haha", primitiveProperties: {} }
        const bo = { [objectInfoSymbol]: () => b }
        const c: ObjectInfo = { isChild: true, position: { line: 1, column: 1 }, parent: bo, property: "rtx", primitiveProperties: {} }
        const r = getPath(c)
        assert.deepEqual([0, "haha", "rtx"], r)
    })
})

describe("cloneDeepWithInfo", () => {
    it("array & object", () => {
        const childArray: Data[] = []
        const obj = { a: 89, b: childArray, c: [] }
        const source = [0, "something", null, false, obj]

        const info = createRootObjectInfo({ line: 1, column: 7}, "hello.json", {})

        const result = cloneDeepWithInfo(source, () => info)

        assert.notStrictEqual(source, result)
        assert.deepEqual(source, result)
        const resultInfo = getInfo(result)
        assert.strictEqual(info, resultInfo)

        const resultObj = result[4]
        assert.notStrictEqual(obj, resultObj)
        assert.deepEqual(obj, resultObj)
        if (resultObj === null || typeof resultObj !== "object") {
            throw "resultObj"
        }
        const resultObjInfo = getInfo(resultObj)
        assert.strictEqual(info, resultObjInfo)

        const resultCa = resultObj.b
        assert.notStrictEqual(resultCa, childArray)
        assert.deepEqual(resultCa, childArray)

        const resultCaInfo = getInfo(resultCa)
        assert.strictEqual(info, resultCaInfo)
    })
})

describe("cloneDeep", () => {
    it("null", () => {
        const result = cloneDeep(null)
        assert.isNull(result)
    })
    it("boolean", () => {
        const result = cloneDeep(true)
        assert.isTrue(result)
    })
    it("string", () => {
        const result = cloneDeep("some string")
        assert.strictEqual("some string", result)
    })
    it("number", () => {
        const result = cloneDeep(15.99)
        assert.strictEqual(15.99, result)
    })
    it("array & object", () => {
        const childArray: Data[] = []
        const obj = { a: 89, b: childArray, c: [] }
        const source = [0, "something", null, false, obj]
        const info = createRootObjectInfo({ line: 1, column: 7}, "hello.json", {})

        const trackedSource = setInfo(source, info)

        const objInfo = createChildObjectInfo({ line: 1, column: 10 }, trackedSource, 4, {})
        const trackedObj = setInfo(obj, objInfo)

        const childArrayInfo = createChildObjectInfo({ line: 1, column: 20 }, trackedObj, "b", {})
        setInfo(childArray, childArrayInfo)

        const result = cloneDeep(source)

        assert.notStrictEqual(source, result)
        assert.deepEqual(source, result)
        const resultInfo = getInfo(result)
        assert.strictEqual(info, resultInfo)

        const resultObj = result[4]
        assert.notStrictEqual(obj, resultObj)
        assert.deepEqual(obj, resultObj)
        if (resultObj === null || typeof resultObj !== "object") {
            throw "resultObj"
        }
        const resultObjInfo = getInfo(resultObj)
        assert.strictEqual(objInfo, resultObjInfo)

        const resultCa = resultObj.b
        assert.notStrictEqual(resultCa, childArray)
        assert.deepEqual(resultCa, childArray)

        const resultCaInfo = getInfo(resultCa)
        assert.strictEqual(childArrayInfo, resultCaInfo)
    })
})

describe("getDescendantFilePosition", () => {
    it("empty", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position,
            primitiveProperties: {}
        }
        const v = setInfo({}, info)
        const vPosition = getDescendantFilePosition(v, [])
        assert.strictEqual(vPosition, position)
    })
    it("none", () => {
        const vPosition = getDescendantFilePosition({}, [])
        assert.isUndefined(vPosition)
    })
    it("primitive", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position: { line: 0, column: 0 },
            primitiveProperties: {
                abracadabra: position
            }
        }
        const v = setInfo({ abracadabra: 54 }, info)
        const vPosition = getDescendantFilePosition(v, ["abracadabra"])
        assert.strictEqual(vPosition, position)
    })
    it("no child", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position: { line: 0, column: 0 },
            primitiveProperties: {
                abracadabra: position
            }
        }
        const v = setInfo({ abracadabraX: 54 }, info)
        const vPosition = getDescendantFilePosition(v, ["abracadabra"])
        assert.isUndefined(vPosition)
    })
    it("primitive, no info", () => {
        const vPosition = getDescendantFilePosition({ abracadabra: 54 }, ["abracadabra"])
        assert.isUndefined(vPosition)
    })
    it("object", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position: { line: 0, column: 0 },
            primitiveProperties: {}
        }
        const a = {}
        const v = setInfo({ abracadabra: a }, info)
        const aInfo: ChildObjectInfo = {
            isChild: true,
            parent: v,
            property: "abracadabra",
            position,
            primitiveProperties: {}
        }
        setInfo(a, aInfo)
        const aPosition = getDescendantFilePosition(v, ["abracadabra"])
        assert.strictEqual(position, aPosition)
    })
    it("array,primitive", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position: { line: 0, column: 0 },
            primitiveProperties: {}
        }
        const a = [54]
        const v = setInfo({ abracadabra: a }, info)
        const aInfo: ChildObjectInfo = {
            isChild: true,
            parent: v,
            property: "abracadabra",
            position: { line: 0, column: 0 },
            primitiveProperties: {
                0: position
            }
        }
        setInfo(a, aInfo)
        const aPosition = getDescendantFilePosition(v, ["abracadabra", 0])
        assert.strictEqual(position, aPosition)
    })
    it("invalid path", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position: { line: 0, column: 0 },
            primitiveProperties: {}
        }
        const a = [54]
        const v = setInfo({ abracadabra: a }, info)
        const aInfo: ChildObjectInfo = {
            isChild: true,
            parent: v,
            property: "abracadabra",
            position: { line: 0, column: 0 },
            primitiveProperties: {
                0: position
            }
        }
        setInfo(a, aInfo)
        const aPosition = getDescendantFilePosition(v, ["abracadabraXXX", 0])
        assert.isUndefined(aPosition)
    })
    it("undefined", () => {
        const position = { line: 12, column: 14 }
        const info : RootObjectInfo = {
            isChild: false,
            url: "someurl",
            position,
            primitiveProperties: {}
        }
        const v = setInfo({}, info)
        const vPosition = getDescendantFilePosition(v, undefined)
        assert.strictEqual(vPosition, position)
    })
})

describe("getAllDirectives", () => {
    it("primitive", () => {
        const propertyPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 57, a: 43 } }
        const rootPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 75, b: 34 } }
        const rootInfo : RootObjectInfo = {
            isChild: false,
            url: "something",
            position: rootPosition,
            primitiveProperties: { ttt: propertyPosition }
        }
        const v = setInfo({ ttt: "x" }, rootInfo)
        const directives = getAllDirectives(v, ["ttt"])
        assert.deepStrictEqual(
            directives,
            {
                a: 43,
                abracadabra: 57,
                b: 34
            }
        )
    })
    it("invalid", () => {
        const propertyPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 57, a: 43 } }
        const rootPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 75, b: 34 } }
        const rootInfo : RootObjectInfo = {
            isChild: false,
            url: "something",
            position: rootPosition,
            primitiveProperties: { ttt: propertyPosition }
        }
        const v = setInfo({ ttt: "x" }, rootInfo)
        const directives = getAllDirectives(v, ["ttt", 13])
        assert.deepStrictEqual(
            directives,
            {}
        )
    })
    it("empty", () => {
        const propertyPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 57, a: 43 } }
        const rootPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 75, b: 34 } }
        const rootInfo : RootObjectInfo = {
            isChild: false,
            url: "something",
            position: rootPosition,
            primitiveProperties: { ttt: propertyPosition }
        }
        const v = setInfo({ ttt: "x" }, rootInfo)
        const directives = getAllDirectives(v, [])
        assert.deepStrictEqual(
            directives,
            {
                abracadabra: 75,
                b: 34
            }
        )
    })
    it("no info for primitive", () => {
        const rootPosition : FilePosition = { line: 12, column: 14, directives: { abracadabra: 75, b: 34 } }
        const rootInfo : RootObjectInfo = {
            isChild: false,
            url: "something",
            position: rootPosition,
            primitiveProperties: {}
        }
        const v = setInfo({ ttt: "x" }, rootInfo)
        const directives = getAllDirectives(v, ["ttt"])
        assert.deepStrictEqual(
            directives,
            {
                abracadabra: 75,
                b: 34
            }
        )
    })
    it("no root info", () => {
        const directives = getAllDirectives({ ttt: "x" }, ["ttt"])
        assert.deepStrictEqual(directives, {})
    })
})
