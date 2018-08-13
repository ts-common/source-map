import { JsonRef, Json } from "@ts-common/json"

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

export const arrayMap = <T extends Json, R extends Json>(
    source: ReadonlyArray<T>,
    f: (v: T, i: number) => R
): ReadonlyArray<R> => {
    let same = true
    const result = source.map((item, i) => {
        const newItem = f(item, i)
        if (newItem !== item as any) {
            same = false
            const itemJson: Json = item
            const newItemJson: Json = newItem
            if (itemJson !== null &&
                typeof itemJson === "object" &&
                newItemJson !== null &&
                typeof newItemJson === "object"
            ) {
                if (getInfo(newItemJson) === undefined) {
                    copyInfo(itemJson, newItemJson)
                }
            }
        }
        return newItem
    })
    if (same) {
        return source as any
    }
    copyInfo(source, result)
    return result
}
