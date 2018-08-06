import { Json, JsonObject, JsonArray, JsonPrimitive } from "@ts-common/json"

interface SourceLink {}

interface TrackedBase<T extends Json>{
    readonly value: T
    readonly link: SourceLink
}

type TrackedPrimitive<T extends JsonPrimitive> = TrackedBase<T>

type Tracked<T extends Json|undefined> =
    T extends JsonObject ? TrackedObject<T> :
    T extends JsonArray ? TrackedArray<T> :
    T extends JsonPrimitive ? TrackedPrimitive<T> :
    undefined

type TrackedObjectProperties<T extends JsonObject> = {
    readonly [K in keyof T]: Tracked<T[K]>
}

interface TrackedObject<T extends JsonObject> extends TrackedBase<T> {
    readonly getProperties: () => TrackedObjectProperties<T>
}

type Items<T> = T extends ReadonlyArray<infer U> ? U : never

type TrackedItems<T extends JsonArray> = Tracked<Items<T>>

type TrackedArrayItems<T extends JsonArray> = {
    readonly [K in keyof T & number]: Tracked<T[K]>
} & ReadonlyArray<TrackedItems<T>>

interface TrackedArray<T extends JsonArray> extends TrackedBase<T> {
    readonly getItems: () => TrackedArrayItems<T>
}
