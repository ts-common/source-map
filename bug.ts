type IsObject<T> = T extends object ? T : never

function asObject(v: {}): object {
    return v
}

function acceptObjectOnly(_: object) {}

interface X {
    toString(): string
}

const x: X = 3

acceptObjectOnly(x)

acceptObjectOnly(asObject(45))

/*
function acceptObjectOnly(_: object) {}

acceptObjectOnly(3) // error: as expected

interface SomeInterfaceProperties {
    toString(): string
}

type NotObject<T> = T extends object ? never : T

const someInterface: SomeInterface = 3

acceptObjectOnly(someInterface) // ok: but error is expected

class MyClass {}

function acceptMyClassOnly(_: MyClass) {}

acceptMyClassOnly(3) // ok: but error is expected

function acceptNumberOnly(_: number) {}

acceptNumberOnly(someInterface) // error: as expected
*/

/// strict interfaces

/// Currently: TS assumes that the interface `CurrentInterface` is an object. Which is not true.
/// For example, `A` could be `string`, `number`, etc.
/// Current behavior makes it very difficult to work with `object` type compare to other JavaScript types
/// such as `string`, `number` etc. It also allows to pass some type errors.

interface CurrentInterface {}

/// proposed:

interface NewInterface {}

type OldInterface = NewInterface & object

/*
const x: number = 3

// const y: object = x

interface A {
    toString(): string
}

type AO = A & object

const itIsNotObject: A = 3

class AA {

}

function rrr(x: AA) {
    console.log(typeof x === "object")
    console.log(Object.keys(x))
}

rrr(itIsNotObject)

rrr(333)

// a bug
const r: object = itIsNotObject

// a bug
const t: AA = itIsNotObject

console.log(t instanceof AA)
*/