import "mocha"
import { assert } from "chai"
import { addInfo, infoSymbol, getInfo } from "./index"

describe("info", () => {
    it("array", () => {
        const x: string[] = []
        const xr = addInfo(x, { kind: "file", url: "/" })
        xr.push("3")
        xr.push("4")
        const info = xr[infoSymbol]
        assert.equal(info.kind, "file")
        const infoX = getInfo(xr)
        if (infoX === undefined) {
            throw new Error("infoX")
        }
        assert.equal(infoX.kind, "file")
    })
})