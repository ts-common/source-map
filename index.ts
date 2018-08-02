import { isArray } from "@ts-common/iterator"
import { Tuple2 } from "@ts-common/tuple"
import { Json, JsonObject } from "@ts-common/json"

export interface SourceLink {
    readonly fileUrl: string
    readonly line: number
    readonly column: number
}

export type PropertiesSource = {
    readonly [k in string]?: SourceLink
}

export interface Source {
    readonly link?: SourceLink
    readonly properties: PropertiesSource | ReadonlyArray<SourceLink|undefined>
}

export interface WithSource<T> {
    readonly value: T
    readonly link?: SourceLink
}

export interface SourceMap {
    readonly get: (original: Json) => SourceLink|undefined
    readonly getItem: <O extends Json>(
        original: ReadonlyArray<O>,
        k: number
    ) => SourceLink|undefined
    readonly getProperty: <O extends JsonObject>(
        original: O,
        k: keyof O & string
    ) => SourceLink|undefined

    readonly array: <T extends Json>(
        items: Iterable<WithSource<T>>,
        link?: SourceLink
    ) => ReadonlyArray<T>

    /*
    readonly arrayMap: <O extends Json, T extends Json>(
        original: ReadonlyArray<O>,
        f: (o: O, link?: SourceLink) => WithSource<T>
    ) => ReadonlyArray<T>
    */
}

export function sourceMap(): SourceMap {
    const map = new Map<object, Source>()
    const get = (o: Json) => {
        if (o === null || typeof o !== "object") {
            return undefined
        }
        const source = map.get(o)
        return source === undefined ? undefined : source.link
    }
    return {
        get,
        getItem: (o, k) => {
            const source = map.get(o)
            if (source === undefined) { return undefined }
            const properties = source.properties
            return isArray(properties) ? properties[k] : undefined
        },
        getProperty: (o, k) => {
            const source = map.get(o)
            if (source === undefined) { return undefined }
            const properties = source.properties
            return isArray(properties) ? undefined : properties[k]
        },
        array: <T extends Json>(items: Iterable<WithSource<T>>, link?: SourceLink) => {
            const result: T[] = []
            const properties: (SourceLink|undefined)[] = []
            for (const item of items) {
                result.push(item.value)
                properties.push(item.link)
            }
            map.set(result, { link, properties })
            return result
        }
    }
}

/*
export type Factory<O, N> = (original: O, link: ObjectSource<O>|undefined) => N

export interface SourceMap {

    readonly get: <O extends object>(original: O) => ObjectSource<O>|undefined

    readonly getPrimitiveProperty: <O extends object, K extends keyof O>(
        original: O, k: K
    ) => SourceLink|undefined

    /*
    readonly transform: <O extends object, N extends object>(
        original: O,
        factory: Factory<O, N>
    ) => N

    readonly array: <N>(link: SourceLink, i: Iterable<Tuple2<N, SourceLink>>) => ReadonlyArray<N>
}

export function sourceMap(): SourceMap {
    const map = new Map<object, ObjectSource<any>>()
    return {

        get: original => map.get(original),

        getPrimitiveProperty: (original, k) => {
            const parent = map.get(original)
            if (parent === undefined) {
                return undefined
            }
            return parent.primitiveProperties[k]
        },

        transform: (original, factory) => {
            const source = map.get(original)
            const result = factory(original, source)
            if (source !== undefined) {
                map.set(result, source)
            }
            return result
        },

        array: (link, i) => {
            const result = []
            const simpleProperties = []
            for(const [n, source] of i) {
                result.push(n)
                properties
            }
            return []
        }
    }
}
*/