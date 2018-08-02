export interface SourceLink {
    readonly fileUrl: string
    readonly line: number
    readonly column: number
}

export interface ObjectSource<T> {
    readonly link: SourceLink
    readonly primitiveProperties: {
        readonly [K in keyof T]?: SourceLink
    }
}

export type Factory<O, N> = (original: O, link: ObjectSource<O>|undefined) => N

export interface SourceMap {

    readonly get: <O extends object>(original: O) => ObjectSource<O>|undefined

    readonly getPrimitiveProperty: <O extends object, K extends keyof O>(
        original: O, k: K
    ) => SourceLink|undefined

    readonly transform: <O extends object, N extends object>(
        original: O,
        factory: Factory<O, N>
    ) => N
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
    }
}
