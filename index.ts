import { StringMap } from "@ts-common/string-map"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as propertySet from "@ts-common/property-set"
import { JsonPrimitive } from '@ts-common/json';

export interface FilePosition {
    readonly line: number
    readonly column: number
}

export interface BaseObjectInfo {
    readonly position: FilePosition
}

export interface RootObjectInfo extends BaseObjectInfo {
    readonly isChild: false
    readonly url: string
}

export const createRootObjectInfo = (position: FilePosition, url: string): RootObjectInfo => ({
    isChild: false,
    position,
    url,
})

export interface ChildObjectInfo extends BaseObjectInfo {
    readonly isChild: true
    readonly parent: ObjectInfo
    readonly property: string|number
}

export const createChildObjectInfo = (
    position: FilePosition,
    parent: ObjectInfo,
    property: string|number
): ChildObjectInfo => ({
    isChild: true,
    position,
    parent,
    property,
})

export type ObjectInfo = ChildObjectInfo|RootObjectInfo

export const objectInfoSymbol = Symbol.for("@ts-common/source-map/object-info")

export interface TrackedBase {
    readonly [objectInfoSymbol]: ObjectInfo
}

export type Tracked<T extends object> = T & TrackedBase

export const setInfo = <T extends object>(value: T, info: ObjectInfo): Tracked<T> => {
    interface MutableTrackedBase {
        [objectInfoSymbol]: ObjectInfo
    }
    type MutableTracked = T & MutableTrackedBase;
    const result = value as MutableTracked
    if (result[objectInfoSymbol] === undefined) {
        result[objectInfoSymbol] = info
    }
    return result
}

export const copyInfo = <T extends object>(source: object, dest: T): T => {
    const info = getInfo(source)
    if (info !== undefined) {
        setInfo(dest, info)
    }
    return dest
}

export const getInfo = (value: object): ObjectInfo|undefined => {
    const withInfo = value as Tracked<object>
    return withInfo[objectInfoSymbol]
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
    source: ReadonlyArray<T>,
    f: (v: T, i: number) => R
): ReadonlyArray<R> => {
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
    source: StringMap<T>,
    b: StringMap<T>
): StringMap<T> => {
    const result = sm.merge(source, b)
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
  !info.isChild ? info : getRootObjectInfo(info.parent)

const getReversedPath = (info: ObjectInfo): Iterable<string|number> => {
    function* iterator() {
        let i = info
        while (i.isChild) {
            yield i.property
            i = i.parent
        }
    }
    return _.iterable(iterator)
}

export const getPath = (info: ObjectInfo): ReadonlyArray<string|number> =>
    _.reverse(getReversedPath(info))
