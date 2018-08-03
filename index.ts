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

export interface ObjectSourceLink {
    readonly link: SourceLink
    readonly primitiveProperties: StringMap<SourceLink>|ReadonlyArray<SourceLink>
}

export interface TrackedObject {
    readonly [trackedObjectSymbol]: ObjectSourceLink
}

export interface TrackedArray<T> extends ReadonlyArray<T>, TrackedObject {}

export interface TrackedStringMap<T> extends StringMap<T>, TrackedObject {}

export type Primitive = boolean|string|number|null

export interface TrackedPrimitive<T extends Primitive> {
    readonly [trackedPrimitiveSymbol]: SourceLink
    readonly value: T
}

export type TrackedBase = TrackedObject|TrackedPrimitive<Primitive>

export const isTrackedObject = (source: TrackedBase): source is TrackedObject =>
    (source as any)[trackedPrimitiveSymbol] === undefined

export interface SourceMap {
    readonly createArray: <I extends TrackedBase>(p: TrackedBase, it: Iterator<I>) => TrackedArray<I>
    readonly createStringMap: <I extends TrackedBase>(
        p: TrackedBase,
        it: Iterator<Entry<I>>,
    ) => TrackedStringMap<I>
    readonly createPropertySet: <T extends TrackedObject>(p: TrackedBase, factory: Factory<T>) => T
}
