# source-map
Source Map

## TypeScript Repository Initialization

1. `npm init`
1. `npm install -D typescript`
1. `package.json`:
    ```json
    "scripts": {
        "tsc": "tsc",
        "test": "tsc && nyc mocha",
        "prepack": "npm install && tsc"
    },
    "nyc": {
        "reporter": [
            "lcov",
            "text"
         ]
    },
    "files": [
        "index.d.ts"
    ],
    ```
1. `npm run tsc -- --init`
1. `tsconfig.json`:
    ```json
    "target": "es2015",
    "declaration": true,
    "sourceMap": true,
    "importHelpers": true

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    ```
1. Create `index.ts`
1. `.gitignore`:
    ```
    *.js
    *.d.ts
    *.map
    ```
1. `npm install -D nyc`
1. `npm install -D mocha`
