const x: number = 3

// const y: object = x

interface A {
    toString(): string
}

type AO = A & object

const itIsNotObject: A = 3

class AA implements A {
    
}

function rrr(x: AA) {
    console.log(typeof x === "object")
    console.log(Object.keys(x))
}

rrr(itIsNotObject)

// a bug
const r: object = itIsNotObject

// a bug
const t: AA = itIsNotObject

console.log(t instanceof AA)