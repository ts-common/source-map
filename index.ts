import { StringMap } from "@ts-common/string-map"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as propertySet from "@ts-common/property-set"
import { JsonPrimitive, isPrimitive } from '@ts-common/json';

export interface FilePosition {
    readonly line: number
    readonly column: number
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

export interface TrackedBase {
    readonly [objectInfoSymbol]: () => ObjectInfo
}

export type Tracked<T extends object> = T & TrackedBase

export const setInfoFunc = <T extends object>(value: T, infoFunc: () => ObjectInfo): Tracked<T> => {
    interface MutableTrackedBase {
        [objectInfoSymbol]: () => ObjectInfo
    }
    type MutableTracked = T & MutableTrackedBase;
    const result = value as MutableTracked
    if (result[objectInfoSymbol] === undefined) {
        result[objectInfoSymbol] = infoFunc
    }
    return result
}

export const setInfo = <T extends object>(value: T, info: ObjectInfo): Tracked<T> =>
    setInfoFunc(value, () => info)

export const getInfoFunc = (value: object): (() => ObjectInfo)|undefined => {
    const withInfo = value as Tracked<object>
    return withInfo[objectInfoSymbol]
}

export const getInfo = (value: object): ObjectInfo|undefined => {
    const f = getInfoFunc(value)
    return f === undefined ? undefined : f()
}

export const copyInfo = <T extends object>(source: object, dest: T): T => {
    const info = getInfoFunc(source)
    if (info !== undefined) {
        setInfoFunc(dest, info)
    }
    return dest
}

export type Data = object|JsonPrimitive

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

export const arrayMap = <T extends Data, R extends Data>(
    source: ReadonlyArray<T>|undefined,
    f: (v: T, i: number) => R
): ReadonlyArray<R> => {
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

export const stringMapMerge = <T extends Data>(
    ...array: Array<StringMap<T>|undefined>
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

const getReversedPath = (info: ObjectInfo): Iterable<string|number> => {
    function* iterator() {
        let i = info
        while (i.isChild) {
            yield i.property
            i = i.parent[objectInfoSymbol]()
        }
    }
    return _.iterable(iterator)
}

export const getPath = (info: ObjectInfo): ReadonlyArray<string|number> =>
    _.reverse(getReversedPath(info))

export const cloneDeep = <T extends Data>(source: T): T => {
    const data: Data = source
    if (data === null ||
        typeof data === "boolean" ||
        typeof data === "number" ||
        typeof data === "string"
    ) {
        return source
    }
    const result = Array.isArray(data) ?
        data.map(cloneDeep) :
        sm.map(data as sm.StringMap<Data>, cloneDeep)
    copyInfo(data, result)
    return result as T
}

export const getFilePosition = (value: object): FilePosition|undefined => {
    const info = getInfo(value)
    return info !== undefined ? info.position : undefined
}

export const getChildFilePosition = (data: object, index: string|number): FilePosition|undefined => {
    const child: Data|undefined = (data as any)[index]
    if (child === undefined) {
        return undefined
    }
    if (isPrimitive(child)) {
        const info = getInfo(data)
        if (info === undefined) {
            return undefined
        }
        return info.primitiveProperties[index]
    }
    return getFilePosition(child)
}

export const getDescendantFilePosition = (
    object: object,
    path: Iterable<string|number>
): FilePosition|undefined => {
    let index: string|number|undefined = undefined
    for (const i of path) {
        if (index !== undefined) {
            object = (object as any)[index]
        }
        index = i
    }
    if (index === undefined) {
        return getFilePosition(object)
    }
    return getChildFilePosition(object, index)
}
