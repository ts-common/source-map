import { JsonRef, Json } from "@ts-common/json"
import { StringMap, stringMap, entries, Entry } from "@ts-common/string-map"
import { map } from "@ts-common/iterator"

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

export type Tracked<T extends JsonRef> = T & TrackedBase

export const setInfo = <T extends JsonRef>(value: T, info: Info): Tracked<T> => {
    interface MutableTrackedBase {
        [infoSymbol]: Info
    }
    type MutableTracked = T & MutableTrackedBase;
    const result = value as MutableTracked
    result[infoSymbol] = info
    return result
}

export const copyInfo = (source: JsonRef, dest: JsonRef) => {
    const info = getInfo(source)
    if (info !== undefined) {
        setInfo(dest, info)
    }
}

export const getInfo = (value: JsonRef): Info|undefined => {
    const withInfo = value as Tracked<JsonRef>
    return withInfo[infoSymbol]
}

export const copyJsonInfo = (source: Json, dest: Json) => {
    if (source !== null &&
        typeof source === "object" &&
        dest !== null &&
        typeof dest === "object"
    ) {
        if (getInfo(dest) === undefined) {
            copyInfo(source, dest)
        }
    }
}

export const arrayMap = <T extends Json, R extends Json>(
    source: ReadonlyArray<T>,
    f: (v: T, i: number) => R
): ReadonlyArray<R> => {
    let same = true
    const result = source.map((item, i) => {
        const newItem = f(item, i)
        if (newItem !== item as any) {
            same = false
            copyJsonInfo(item, newItem)
        }
        return newItem
    })
    if (same) {
        return source as any
    }
    copyInfo(source, result)
    return result
}

export const stringMapMap = <T extends Json, R extends Json>(
    source: StringMap<T>,
    f: (s: Entry<T>) => Entry<R>
): StringMap<R> => {
    let same = true
    const result = stringMap(map(
        entries(source),
        e => {
            const r = f(e)
            if (e[0] === r[0] && e[1] === r[1] as any) {
                return r
            }
            same = false
            copyJsonInfo(e[1], r[1])
            return r
        }
    ))
    if (same) {
        return source as any
    }
    copyInfo(source, result)
    return result
}
