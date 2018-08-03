import { Factory } from "@ts-common/property-set"
import { Entry, StringMap } from '@ts-common/string-map';

export const trackedObjectSymbol = Symbol("trackedObject")
export const trackedPrimitiveSymbol = Symbol("trackedPrimitive")

export interface SourceLink {
    readonly fileUrl: string
    readonly objectPath: ReadonlyArray<string|number>
    readonly line: number
    readonly column: number
}

export interface ObjectSourceLink extends SourceLink {
    readonly primitiveProperties: StringMap<SourceLink>|ReadonlyArray<SourceLink>
}

export interface TrackedObjectBase {
    readonly [trackedObjectSymbol]: ObjectSourceLink
}

export type TrackedObject<T extends object> = T & TrackedObjectBase

export type TrackedArray<T> = ReadonlyArray<T> & TrackedObjectBase

export type Primitive = boolean|string|number|null

export interface TrackedPrimitive<T extends Primitive> {
    readonly [trackedPrimitiveSymbol]: SourceLink
    readonly value: T
}

export type TrackedBase = TrackedObjectBase|TrackedPrimitive<Primitive>

export const isTrackedObject = (source: TrackedBase): source is TrackedObjectBase =>
    (source as any)[trackedPrimitiveSymbol] === undefined

export type Tracked<T> =
    T extends Primitive ? TrackedPrimitive<T> :
    T extends object ? TrackedObject<T> :
    undefined

export type TrackedPropertySet<T> = {
    readonly [K in keyof T]: Tracked<T[K]>
}

interface MutableTrackedObject {
    [trackedObjectSymbol]: ObjectSourceLink
}

function addTrackedObject<T extends object>(value: T): TrackedObject<T> {
    const result = value as (T & MutableTrackedObject)
    result[trackedObjectSymbol] = {} as ObjectSourceLink
    return result
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