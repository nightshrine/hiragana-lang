import {readFileSync} from "node:fs";
import Interpreter from "./lang/interpreter.ts";

// 使い方: npm run cli -- examples/fizzbuzz.hira
const path = process.argv[2];

if (!path) {
    console.error("つかいかた: npm run cli -- <ふぁいる>");
    process.exit(1);
}

const program = readFileSync(path, "utf-8");

try {
    Interpreter(
        program,
        (text) => console.log(text),
        (text) => console.error(text),
    ).launch();
} catch {
    process.exit(1);
}
