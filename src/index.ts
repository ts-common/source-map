import { StringMap } from "@ts-common/string-map"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as propertySet from "@ts-common/property-set"
import * as json from '@ts-common/json';

export interface FilePosition {
    readonly line: number
    readonly column: number
    /**
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

export type ObjectInfo = ChildObjectInfo|RootObjectInfo

export const objectInfoSymbol = Symbol.for("@ts-common/source-map/object-info")

export interface TrackedBaseInterface {
    readonly [objectInfoSymbol]: InfoFunc
}

export type TrackedBase = TrackedBaseInterface & json.JsonObject

export type Tracked<T extends json.JsonRef> = T & TrackedBase

export type InfoFunc = () => ObjectInfo

export const setInfoFunc = <T extends json.JsonRef>(value: T, infoFunc: InfoFunc): Tracked<T> => {
    interface MutableTrackedBase {
        [objectInfoSymbol]: InfoFunc
    }
    type MutableTracked = T & MutableTrackedBase & json.JsonObject;
    const result = value as MutableTracked
    if (result[objectInfoSymbol] === undefined) {
        result[objectInfoSymbol] = infoFunc
    }
    return result
}

export const setInfo = <T extends json.JsonRef>(value: T, info: ObjectInfo): Tracked<T> =>
    setInfoFunc(value, () => info)

export const getInfoFunc = (value: json.JsonRef | undefined): InfoFunc|undefined => {
    if (value === undefined) {
        return undefined
    }
    const withInfo = value as Tracked<json.JsonRef>
    return withInfo[objectInfoSymbol]
}

export const getInfo = (value: json.JsonRef | undefined): ObjectInfo|undefined => {
    const f = getInfoFunc(value)
    return f === undefined ? undefined : f()
}

export const copyInfo = <T extends json.JsonRef>(source: json.JsonRef, dest: T): T => {
    const info = getInfoFunc(source)
    if (info !== undefined) {
        setInfoFunc(dest, info)
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

export const getRootObjectInfo = (info: ObjectInfo): RootObjectInfo =>
  !info.isChild ? info : getRootObjectInfo(info.parent[objectInfoSymbol]())

const getReversedInfoIterator = function *(info: ObjectInfo): IterableIterator<ObjectInfo> {
    while (info.isChild) {
        yield info
        info = info.parent[objectInfoSymbol]()
    }
    yield info
}

export const getPath = (info: ObjectInfo): readonly (string|number)[] =>
    _.reverse(_.filterMap(getReversedInfoIterator(info), i => i.isChild ? i.property : undefined))

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
    let i = getInfo(parent)
    if (i === undefined) {
        return
    }
    yield *_.map(getReversedInfoIterator(i), v => v.position)
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
