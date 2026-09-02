import Interpreter from "./lang/interpreter.ts";
import "./styles.css";

const INITIAL_PROGRAM =
`めも ふぃぼなっちすうれつ
「まえ」 は 0 。
「いま」 は 1 。
くりかえし 「かいすう」 を 0 から 10 ここから
  みせる 「まえ」 。
  「つぎ」 は 「まえ」 たす 「いま」 。
  「まえ」 は 「いま」 。
  「いま」 は 「つぎ」 。
ここまで

めも ふぃずばず
くりかえし 「かず」 を 0 から 30 ここから
  もし 「かず」 あまり 3 ひとしい 0 かつ 「かず」 あまり 5 ひとしい 0 ここから
    みせる "FizzBuzz" 。
  ここまで それとも 「かず」 あまり 3 ひとしい 0 ここから
    みせる "Fizz" 。
  ここまで それとも 「かず」 あまり 5 ひとしい 0 ここから
    みせる "Buzz" 。
  ここまで ちがえば ここから
    みせる 「かず」 。
  ここまで
ここまで`;

const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const console_ = document.querySelector<HTMLDivElement>("#console")!;
const status = document.querySelector<HTMLSpanElement>("#status")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;

editor.value = INITIAL_PROGRAM;

const appendLog = (type: "info" | "error", text: string) => {
    const line = document.createElement("div");
    line.className = type;
    line.textContent = text;
    console_.append(line);
};

const run = () => {
    console_.replaceChildren();
    let lines = 0;
    let failed = false;

    try {
        Interpreter(
            editor.value,
            (text) => {
                lines++;
                appendLog("info", text);
            },
            (text) => {
                failed = true;
                appendLog("error", text);
            },
        ).launch();
    } catch {
        // インタプリタ側でエラーを出力済みなので、ここでは停止するだけ
    }

    status.textContent = failed ? "えらーがあります" : `${lines} ぎょう`;
    status.classList.toggle("status-error", failed);
    console_.scrollTop = console_.scrollHeight;
};

runButton.addEventListener("click", run);

// Ctrl/Cmd + Enter で実行
document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        run();
    }
});

// Tab キーでフォーカスを移さず字下げする
editor.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
        return;
    }
    event.preventDefault();
    const {selectionStart, selectionEnd} = editor;
    editor.setRangeText("  ", selectionStart, selectionEnd, "end");
});

// リファレンスの例をクリックすると、カーソル位置に挿入する
document.querySelectorAll<HTMLElement>("[data-snippet]").forEach((element) => {
    element.addEventListener("click", () => {
        const snippet = element.dataset.snippet!;
        const {selectionStart, selectionEnd} = editor;
        const needsNewline = snippet.includes("\n") && selectionStart > 0 && editor.value[selectionStart - 1] !== "\n";
        editor.setRangeText((needsNewline ? "\n" : "") + snippet, selectionStart, selectionEnd, "end");
        editor.focus();
    });
});
