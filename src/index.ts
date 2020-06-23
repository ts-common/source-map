import { StringMap } from "@ts-common/string-map"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as propertySet from "@ts-common/property-set"
import * as json from '@ts-common/json';

export interface FilePosition {
    readonly line: number
    readonly column: number
    /*
     * This optional field can be used by parsers to set directives/pragmas.
     */
    readonly directives?: StringMap<unknown>
}

export interface BaseObjectInfo {
    readonly position: FilePosition
    readonly primitiveProperties: StringMap<FilePosition>
}

export interface RootObjectInfo extends BaseObjectInfo {
    readonly isChild: false
    readonly url: string
}

export const createRootObjectInfo = (
    position: FilePosition,
    url: string,
    primitiveProperties: StringMap<FilePosition>
): RootObjectInfo => ({
    isChild: false,
    position,
    url,
    primitiveProperties
})

export interface ChildObjectInfo extends BaseObjectInfo {
    readonly isChild: true
    readonly parent: TrackedBase
    readonly property: string|number
}

export const createChildObjectInfo = (
    position: FilePosition,
    parent: TrackedBase,
    property: string|number,
    primitiveProperties: StringMap<FilePosition>
): ChildObjectInfo => ({
    isChild: true,
    position,
    parent,
    property,
    primitiveProperties
})

export type ObjectInfo = ChildObjectInfo|RootObjectInfo;

export const objectInfoSymbol = Symbol.for("@ts-common/source-map/object-info")

export interface infoIdx {
    readonly lineColPrimIdx: number
    readonly directiveIdx: number
    readonly parentPropIdx: number
    readonly urlIdx: number
    readonly isChild: boolean
}

let lineArr: Array<number> = [];
let colArr: Array<number> = [];
let dirArr: Array<StringMap<unknown>> = [];
// n = size
// n + 1 = key start idx
// n + 2 = col, line start idx
// n + 3 = primprop?? tba
let primPropIdxArr: Array<number> = []; // self made map would be better, maybe a string|number array
let primPropLineArr: Array<number> = [];
let primPropColArr: Array<number> = [];
let primPropKeyArr: Array<string> = [];
let primPropDirArr: Array<StringMap<unknown>> = [];
let parentArr: Array<number> = []; // Weak map? key = tracked base, value = idxArr idx
let propArr: Array<string|number> = [];
let urlArr: Array<string> = [];
// Get rid of description (in sway)

// another array to get all the idx (1d array representing n*5) using uint8array
// n = lineColPrimIdx
// +1 = directiveIdx
// +2 = parentPropIdx
// +3 = urlIdx
// +4 = isChild
let idxArr: Array<number> = [];

export interface TrackedBaseInterface {
    readonly [objectInfoSymbol]: number
}

export type TrackedBase = TrackedBaseInterface & json.JsonObject

export type Tracked<T extends json.JsonRef> = T & TrackedBase

export type InfoFunc = () => ObjectInfo

export const setInfoFunc = <T extends json.JsonRef>(value: T, infoFunc: InfoFunc): Tracked<T> => {
    interface MutableTrackedBase {
        [objectInfoSymbol]: number
    }
    type MutableTracked = T & MutableTrackedBase & json.JsonObject;
    const result = value as MutableTracked
    if (result[objectInfoSymbol] === undefined) { // grab from weak map instead
        const info = infoFunc()
        lineArr.push(info.position.line)
        colArr.push(info.position.column)
        if (info.position.directives !== undefined) {
            dirArr.push(info.position.directives)
        }

        for (var key in info.primitiveProperties) {
            var entry = info.primitiveProperties[key]
            if (entry !== undefined) {
                primPropLineArr.push(entry.line)
                primPropColArr.push(entry.column)
                primPropKeyArr.push(key)
                primPropIdxArr.push(100)
                primPropIdxArr.push(100)
                primPropIdxArr.push(100)
                primPropIdxArr.push(100)
                if (entry.directives !== undefined) {
                    primPropDirArr.push(entry.directives)
                }
            }
        }
        // primPropArr.push(info.primitiveProperties)
        if (info.isChild) {
            parentArr.push(info.parent[objectInfoSymbol])
            propArr.push(info.property)
        } else {
            const root = info as RootObjectInfo
            urlArr.push(root.url)
        }

        result[objectInfoSymbol] = idxArr.length

        idxArr.push(lineArr.length - 1)
        idxArr.push(info.position.directives !== undefined? -1 : dirArr.length - 1)
        idxArr.push(info.isChild?parentArr.length - 1:-1)
        idxArr.push(info.isChild?-1:urlArr.length - 1)
        idxArr.push(info.isChild?1:0)
    }
    return result
}

export const setInfo = <T extends json.JsonRef>(value: T, info: ObjectInfo): Tracked<T> => {
    return setInfoFunc(value, () => info)
}

export const getInfoFunc = (value: json.JsonRef | undefined): InfoFunc|undefined => {
    const info = getInfo(value)
    if (value === undefined || info === undefined) {
        return undefined
    }
    return () => { return info}
}

export const getInfo = (value: json.JsonRef | undefined): ObjectInfo|undefined => {
    const withInfo = value as Tracked<json.JsonRef>
    const iidx = withInfo[objectInfoSymbol]
    if (iidx === undefined) return undefined
    const lineColPrimIdx = idxArr[iidx]
    const directiveIdx = idxArr[iidx+1]
    const parentPropIdx = idxArr[iidx+2]
    const urlIdx = idxArr[iidx+3]
    const isChild = idxArr[iidx+4]

    const objInfo:ObjectInfo = isChild? {
        isChild: true,
        position:{line: lineArr[lineColPrimIdx], column: colArr[lineColPrimIdx], directives: directiveIdx===-1?undefined:dirArr[directiveIdx]},
        parent: {[objectInfoSymbol]:parentArr[parentPropIdx]},
        property: propArr[parentPropIdx],
        primitiveProperties: {}//primPropArr[lineColPrimIdx]
    }:{
        isChild: false,
        position: {line: lineArr[lineColPrimIdx], column: colArr[lineColPrimIdx], directives: directiveIdx===-1?undefined:dirArr[directiveIdx]},
        url: urlArr[urlIdx],
        primitiveProperties: {}//primPropArr[lineColPrimIdx]
    }
    return objInfo
}

export const getInfoIdx = (value: json.JsonRef | undefined) : number | undefined => {
    const withInfo = value as Tracked<json.JsonRef>
    const iidx = withInfo[objectInfoSymbol]
    if (iidx === undefined) return undefined
    return iidx
}

export const copyInfo = <T extends json.JsonRef>(source: json.JsonRef, dest: T): T => {
    const info = getInfo(source)
    if (info !== undefined) {
        setInfo(dest, info)
    }
    return dest
}

export type Data = json.Json

export const copyDataInfo = <T extends Data>(source: Data, dest: T): T => {
    const destJson: Data = dest
    if (source !== null &&
        typeof source === "object" &&
        destJson !== null &&
        typeof destJson === "object"
    ) {
        copyInfo(source, destJson)
    }
    return dest
}

export type JsonArrayOf<T> = ReadonlyArray<T> & object

export const arrayMap = <T extends Data, R extends Data>(
    source: JsonArrayOf<T>|undefined,
    f: (v: T, i: number) => R
): JsonArrayOf<R> => {
    if (source === undefined) {
        return []
    }
    const result = source.map((v, i) => copyDataInfo(v, f(v, i)))
    if (_.isEqual(source, result)) {
        return source as any
    }
    copyInfo(source, result)
    return result
}

/**
 * Transform an object.
 *
 * @param source
 * @param f
 */
export const stringMapMap = <T extends Data, R extends Data>(
    source: StringMap<T>|undefined,
    f: (v: T, k: string) => R
): StringMap<R> => {
    if (source === undefined) {
        return {}
    }
    const result = sm.map(source, (v, k) => {
        const r = f(v, k)
        copyDataInfo(v, r)
        return r
    })
    if (sm.isEqual(source, result)) {
        return source as any
    }
    copyInfo(source, result)
    return result
}

/**
 * Merge objects
 *
 * @param array
 */
export const stringMapMerge = <T extends Data>(
    ...array: readonly (StringMap<T>|undefined)[]
): StringMap<T> => {
    if (array.length === 0) {
        return {}
    }
    const result = sm.merge(...array)
    const source = array[0]
    if (source === undefined) {
        return result
    }
    if (sm.isEqual(source, result)) {
        return source
    }
    copyInfo(source, result)
    return result
}

export const propertySetMap = <T extends sm.PartialStringMap<keyof T & string, Data>>(
    source: T,
    f: propertySet.PartialFactory<T>
): T => {
    const result = propertySet.copyCreate(source, f)
    if (sm.isEqual(sm.toStringMap(source), sm.toStringMap(result))) {
        return source as any
    }
    propertySet.forEach(result, (v, k) => {
        const sourceValue: Data|undefined = source[k]
        const vv: Data|undefined = v
        if (sourceValue !== undefined && vv !== undefined) {
            copyDataInfo(sourceValue, vv)
        }
    })
    copyInfo(source, result)
    return result
}

export const getRootObjectInfo = (info: ObjectInfo): RootObjectInfo => {
    return !info.isChild ? info : getRootObjectInfoHelper(parentArr[idxArr[info.parent[objectInfoSymbol]+2]])
}

const getRootObjectInfoHelper = (iidx: number): RootObjectInfo => {
    const lineColPrimIdx = idxArr[iidx]
    const directiveIdx = idxArr[iidx+1]
    const parentPropIdx = idxArr[iidx+2]
    const urlIdx = idxArr[iidx+3]
    const isChild = idxArr[iidx+4]
    return !isChild ? {
    isChild: false,
    position: {line: lineArr[lineColPrimIdx], column: colArr[lineColPrimIdx], directives: directiveIdx===-1?undefined:dirArr[directiveIdx]},
    url: urlArr[urlIdx],
    primitiveProperties: {}//primPropArr[lineColPrimIdx]
    } : getRootObjectInfoHelper(parentArr[parentPropIdx])
}


const getReversedInfoIterator = function *(info: number): IterableIterator<number> {
    while (idxArr[info+4]) {
        yield info
        info = parentArr[idxArr[info+2]]
    }
    yield info
}

export const getPath = (info: number | undefined): readonly (string|number)[] => {
    if (info === undefined) return _.reverse(undefined)
    let temp: Array<string|number> = [];
    while (info !== undefined) {
        if (propArr[idxArr[info+2]] === undefined) break;
        temp.unshift(propArr[idxArr[info+2]])
        info = parentArr[idxArr[info+2]]
    }
    return temp
}

/**
 * Returns a deep clone of `source` and set a source-map for each member.
 *
 * @param source an original object
 * @param getInfoFunctOptional the function should return an object info of a provided member.
 *     If the function is not provided the algorithm extract information from the provided member.
 */
export const cloneDeep = <T extends Data>(
    source: T,
    getInfoFuncOptional?: (member: Data|undefined) => InfoFunc|undefined
): T => {
    const get = getInfoFuncOptional === undefined ? getInfoFunc : getInfoFuncOptional
    const clone = (data: Data): Data => {
        if (data === null ||
            typeof data === "boolean" ||
            typeof data === "number" ||
            typeof data === "string"
        ) {
            return data
        }
        const result = _.isArray(data) ?
            data.map(clone) :
            sm.map(data, clone)
        const infoFunc = get(data)
        if (infoFunc !== undefined) {
            setInfoFunc(result, infoFunc)
        }
        return result
    }
    return clone(source) as T
}

/**
 * Returns a deep clone of `source`. Each member of the returned object will contain the provided
 * source-map information.
 *
 * @param source
 * @param infoFunc
 */
export const cloneDeepWithInfo = <T extends Data>(source: T, infoFunc: InfoFunc | undefined): T =>
    cloneDeep(source, () => infoFunc)

/**
 * Get a file position
 *
 * @param value
 */
export const getFilePosition = (value: json.JsonRef): FilePosition|undefined => {
    const info = getInfo(value)
    return info !== undefined ? info.position : undefined
}

/**
 * Get a position of a child.
 *
 * @param data
 * @param index
 */
export const getChildFilePosition = (
    data: json.JsonRef|undefined,
    index: string|number|undefined,
): FilePosition|undefined => {
    if (data === undefined) {
        return undefined
    }
    if (index === undefined) {
        return getFilePosition(data)
    }
    const child: Data|undefined = (data as any)[index]
    if (child === undefined) {
        return undefined
    }
    if (json.isPrimitive(child)) {
        const info = getInfo(data)
        if (info === undefined) {
            return undefined
        }
        return info.primitiveProperties[index]
    }
    return getFilePosition(child)
}

interface DataRef {
    readonly parent: json.JsonRef|undefined
    readonly index: string|number|undefined
}

/**
 * Returns a data reference corresponding to the given path.
 *
 * @param object
 * @param path
 */
const getDataRef = (object: json.JsonRef, path: Iterable<string|number>|undefined): DataRef => {
    if (path === undefined) {
        return { parent: object, index: undefined }
    }
    let index: string|number|undefined = undefined
    // preserve the last index.
    for (const i of path) {
        if (index !== undefined) {
            const newObject = (object as any)[index]
            if (newObject === null || typeof newObject !== "object") {
                return { parent: undefined, index: undefined }
            }
            object = newObject
        }
        index = i
    }
    return { parent: object, index }
}

/**
 * Get a file position of a descendant by path.
 *
 * @param object
 * @param path
 */
export const getDescendantFilePosition = (
    object: json.JsonRef,
    path: Iterable<string|number>|undefined
): FilePosition|undefined => {
    const dataRef = getDataRef(object, path)
    return getChildFilePosition(dataRef.parent, dataRef.index)
}

const getReversedFilePositions = function *(dataRef: DataRef): IterableIterator<FilePosition> {
    const parent = dataRef.parent
    if (parent === undefined) {
        return
    }
    if (dataRef.index !== undefined) {
        const filePosition = getChildFilePosition(parent, dataRef.index)
        if (filePosition !== undefined) {
            yield filePosition
        }
    }
    let i = parent as Tracked<json.JsonRef>
    if (i === undefined) {
        return
    }
    yield *_.map(getReversedInfoIterator(i[objectInfoSymbol]), v => {
        const pos:FilePosition = {
            line: lineArr[idxArr[v]],
            column: colArr[idxArr[v]], 
            directives: idxArr[v+1]===-1?undefined:dirArr[idxArr[v+1]]}
        return pos
    })
}

export const getAllDirectives = (
    object: json.JsonRef,
    path: Iterable<string|number>|undefined,
): StringMap<unknown> => {
    const dataRef = getDataRef(object, path)
    const reversedFilePositions = getReversedFilePositions(dataRef)
    const reversedDirectives = _.filterMap(reversedFilePositions, v => v.directives)
    const directives = _.reverse(reversedDirectives)
    return sm.merge(...directives)
}
eval("global")["clearStringMap"] = () => {
    //primPropArr.splice(0);
    // dirArr.splice(0);
    // parentArr.splice(0);
}