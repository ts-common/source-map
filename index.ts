import { JsonRef } from "@ts-common/json"

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

const infoSymbol = Symbol("info")

export interface TrackedBase {
    readonly [infoSymbol]: Info
}

export type Tracked<T extends JsonRef> = T & TrackedBase

interface MutableTrackedBase {
    [infoSymbol]: Info
}

type MutableTracked<T extends JsonRef> = T & MutableTrackedBase

export const addInfo = <T extends JsonRef>(value: T, info: Info): Tracked<T> => {
    const result = value as MutableTracked<T>
    result[infoSymbol] = info
    return result
}
