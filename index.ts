import { StringMap, MutableStringMap } from "@ts-common/string-map"
import { Json, JsonObject, JsonPrimitive } from "@ts-common/json"

export const trackedObjectSymbol = Symbol("trackedObject")
export const trackedPrimitiveSymbol = Symbol("trackedPrimitive")

export interface SourceLink {
    readonly fileUrl: string
    readonly objectPath: ReadonlyArray<string|number>
    readonly line: number
    readonly column: number
}

export interface ObjectSourceLink {
    readonly link: SourceLink
    readonly primitiveProperties: StringMap<SourceLink>
}

export interface TrackedObjectBase {
    readonly [trackedObjectSymbol]: ObjectSourceLink
}

export type TrackedObject<T extends object> = T & TrackedObjectBase

export type TrackedArray<T> = ReadonlyArray<T> & TrackedObjectBase

export interface TrackedPrimitive<T extends JsonPrimitive> {
    readonly [trackedPrimitiveSymbol]: SourceLink
    readonly value: T
}

export type TrackedBase = TrackedObjectBase|TrackedPrimitive<JsonPrimitive>

export const isTrackedObject = (tracked: TrackedBase): tracked is TrackedObjectBase =>
    (tracked as any)[trackedPrimitiveSymbol] === undefined

export const getSourceLink = (tracked: TrackedBase): SourceLink =>
    isTrackedObject(tracked) ? tracked[trackedObjectSymbol].link : tracked[trackedPrimitiveSymbol]

export type Tracked<T extends Json|undefined> =
    // null|string|...
    T extends JsonPrimitive ? TrackedPrimitive<T> :
    // JsonObject and JsonArray
    T extends object ? TrackedObject<T> :
    // undefined
    undefined

export type TrackedPropertySet<T extends JsonObject> = {
    readonly [K in keyof T]: Tracked<T[K]>
}

interface MutableTrackedObject {
    [trackedObjectSymbol]: ObjectSourceLink
}

export const addTrackedObject = <T extends object>(value: T, link: ObjectSourceLink): TrackedObject<T> => {
    const result = value as (T & MutableTrackedObject)
    result[trackedObjectSymbol] = link
    return result
}

export const createArray = <T extends Json>(tracked: TrackedBase, it: Iterable<Tracked<T>>): TrackedArray<T> => {
    const result: Array<T> = []
    const primitiveProperties: MutableStringMap<SourceLink> = {}
    for (const i of it) {
        if (i === undefined) {
            result.push(undefined as any)
        }
        if (isTrackedObject(i)) {
            result.push(i)
        }
        // result.push(i)
    }
    return addTrackedObject(result, { link: getSourceLink(tracked), primitiveProperties:primitiveProperties })
}

/*
export const createArray = <I extends TrackedBase>(p: TrackedBase, it: Iterator<I>): TrackedArray<I> => {
    const result: Array<I> = []
    const sourceLink: ObjectSourceLink = {}
    result[trackedObjectSymbol] = sourceLink
}
*/

/*
export interface SourceMap {
    readonly createArray: <I extends TrackedBase>(
        p: TrackedBase,
        it: Iterator<I>
    ) => TrackedArray<I>
    readonly createStringMap: <I extends TrackedBase>(
        p: TrackedBase,
        it: Iterator<Entry<I>>,
    ) => TrackedStringMap<I>
    readonly createPropertySet: <T extends TrackedObject>(
        p: TrackedBase,
        factory: Factory<TrackedPropertySet<T>>
    ) => T
}
*/