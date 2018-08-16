import { StringMap } from "@ts-common/string-map"
import * as sm from "@ts-common/string-map"
import * as _ from "@ts-common/iterator"
import * as propertySet from "@ts-common/property-set"
import { JsonPrimitive } from '@ts-common/json';

export interface FileInfo {
    readonly kind: "file"
    readonly url: string
}

export interface FilePosition {
    readonly line: number
    readonly column: number
}

export interface ObjectInfo {
    readonly kind: "object"
    readonly position: FilePosition
    readonly parent: Info
    readonly property: string|number
}

export type Info = FileInfo|ObjectInfo

export const infoSymbol = Symbol("info")

export interface TrackedBase {
    readonly [infoSymbol]: Info
}

export type Tracked<T extends object> = T & TrackedBase

export const setInfo = <T extends object>(value: T, info: Info): Tracked<T> => {
    interface MutableTrackedBase {
        [infoSymbol]: Info
    }
    type MutableTracked = T & MutableTrackedBase;
    const result = value as MutableTracked
    if (result[infoSymbol] === undefined) {
        result[infoSymbol] = info
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

export const getInfo = (value: object): Info|undefined => {
    const withInfo = value as Tracked<object>
    return withInfo[infoSymbol]
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
    source: StringMap<T>,
    f: (v: T, k: string) => R
): StringMap<R> => {
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

type PartialStringMap<K> = { readonly [k in K & string]?: Data }

const toStringMap = <T extends PartialStringMap<keyof T>>(v: T): StringMap<Data|undefined> => v

export const propertySetMap = <T extends PartialStringMap<keyof T>>(
    source: T,
    f: propertySet.PartialFactory<T>
): T => {
    const result = propertySet.copyCreate(source, f)
    if (sm.isEqual(toStringMap(source), toStringMap(result))) {
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
