export enum TokenType {
    INTEGER,
    DOUBLE,
    STRING,
    IDENTIFIER,
    PLUS,
    MINUS,
    MUL,
    DIV,
    MOD,
    AND,
    OR,
    EQUAL,
    LT,
    GT,
    LE,
    GE,
    LPAREN,
    RPAREN,
    LBRACE,
    RBRACE,
    SEMICOLON,
    NULL,
    TRUE,
    FALSE,
    IF,
    ELSE_IF,
    ELSE,
    PRINT,
    ASSIGN,
    FOR,
    TO,
    IN,
    WHILE,
    EOF,
}

// ひらがなの予約語。長い語から順に照合する（最長一致）ので、ここでの順序は問わない
const KEYWORDS: ReadonlyMap<string, TokenType> = new Map([
    // 制御構文
    ["もし", TokenType.IF],
    ["それとも", TokenType.ELSE_IF],
    ["ちがえば", TokenType.ELSE],
    ["くりかえし", TokenType.FOR],
    ["を", TokenType.IN],
    ["から", TokenType.TO],
    ["あいだ", TokenType.WHILE],
    ["ここから", TokenType.LBRACE],
    ["ここまで", TokenType.RBRACE],
    // 代入・出力
    ["は", TokenType.ASSIGN],
    ["みせる", TokenType.PRINT],
    // 演算子
    ["たす", TokenType.PLUS],
    ["ひく", TokenType.MINUS],
    ["かける", TokenType.MUL],
    ["わる", TokenType.DIV],
    ["あまり", TokenType.MOD],
    ["ひとしい", TokenType.EQUAL],
    ["ちいさい", TokenType.LT],
    ["おおきい", TokenType.GT],
    ["いか", TokenType.LE],
    ["いじょう", TokenType.GE],
    ["かつ", TokenType.AND],
    ["または", TokenType.OR],
    // リテラル
    ["ほんとう", TokenType.TRUE],
    ["うそ", TokenType.FALSE],
    ["なし", TokenType.NULL],
]);

// 記号。全角も受け付ける
const SYMBOLS: ReadonlyMap<string, TokenType> = new Map([
    ["。", TokenType.SEMICOLON],
    ["(", TokenType.LPAREN],
    ["（", TokenType.LPAREN],
    [")", TokenType.RPAREN],
    ["）", TokenType.RPAREN],
]);

const COMMENT = "めも";
const IDENTIFIER_OPEN = "「";
const IDENTIFIER_CLOSE = "」";
const STRING_QUOTES = ['"', '“', '”'];
const WHITESPACE = [" ", "　", "\t", "\r"];

export type Token = {
    type: TokenType,
    position: number,
    column: number,
    line: number;
    value?: string,
}

export class LexerError extends Error {
    constructor(line: number, column: number, message: string) {
        super(`[よみとりえらー] ぎょう ${line}, れつ ${column}：${message}`);
        this.name = "LexerError";
    }
}

// エラー文でトークンを人間向けに表示する
export const describeToken = (token: Token): string => {
    switch (token.type) {
        case TokenType.IDENTIFIER:
            return `「${token.value}」`;
        case TokenType.STRING:
            return `"${token.value}"`;
        case TokenType.INTEGER:
        case TokenType.DOUBLE:
            return token.value!;
        case TokenType.EOF:
            return "ぷろぐらむのおわり";
    }
    for (const [word, type] of [...KEYWORDS, ...SYMBOLS]) {
        if (type === token.type) {
            return word;
        }
    }
    return TokenType[token.type];
}

const isDigit = (char: string) => /^[0-9０-９]$/.test(char);
const isDot = (char: string) => char === "." || char === "．";

// 全角数字・全角ピリオドを半角に寄せる
const normalizeDigit = (char: string) => {
    if (isDot(char)) {
        return ".";
    }
    return String.fromCharCode(char.charCodeAt(0) - (char >= "０" ? 0xFEE0 : 0));
}

type ReturnType = {
    lex: () => Token[],
}

export default function Lexer(program: string): ReturnType {

    // 「が」のような結合文字（か + 濁点）も1文字として扱うため、書記素単位で区切る
    const segmenter = new Intl.Segmenter("ja", {granularity: "grapheme"});
    const toGraphemes = (text: string): string[] => [...segmenter.segment(text)].map((s) => s.segment);

    // 最長一致させるため、長い予約語から順に並べておく
    const keywords = [...KEYWORDS.entries()]
        .map(([word, type]) => ({word, type, length: toGraphemes(word).length}))
        .sort((a, b) => b.length - a.length);
    const commentLength = toGraphemes(COMMENT).length;

    const lex = (): Token[] => {
        const tokens: Token[] = [];
        const segments = toGraphemes(program);

        let position = 0;
        let column = 1;
        let line = 1;

        const isEnd = () => position >= segments.length;

        // 1文字消費して返す。行・列はここでだけ更新する
        const advance = (): string => {
            const char = segments[position++];
            if (char === "\n") {
                line++;
                column = 1;
            } else {
                column++;
            }
            return char;
        }

        // 現在位置から word が続いているか
        const startsWith = (word: string, length: number) => {
            return segments.slice(position, position + length).join("") === word;
        }

        while (!isEnd()) {
            const char = segments[position];
            const start = {position, line, column};
            const createToken = (type: TokenType, value?: string) => {
                tokens.push({type, ...start, value});
            }

            if (char === "\n" || WHITESPACE.includes(char)) {
                advance();
                continue;
            }

            // コメント: 「めも」から行末まで読み飛ばす（改行は次のループで処理）
            if (startsWith(COMMENT, commentLength)) {
                while (!isEnd() && segments[position] !== "\n") {
                    advance();
                }
                continue;
            }

            // 変数名: 「 」 で囲む
            if (char === IDENTIFIER_OPEN) {
                advance();
                let value = "";
                while (!isEnd() && segments[position] !== IDENTIFIER_CLOSE) {
                    if (segments[position] === "\n") {
                        throw new LexerError(start.line, start.column, "へんすうめいが「」でとじられていません");
                    }
                    value += advance();
                }
                if (isEnd()) {
                    throw new LexerError(start.line, start.column, "へんすうめいが「」でとじられていません");
                }
                advance();
                if (value === "") {
                    throw new LexerError(start.line, start.column, "へんすうめいがからっぽです");
                }
                createToken(TokenType.IDENTIFIER, value);
                continue;
            }

            // 文字列: " " で囲む
            if (STRING_QUOTES.includes(char)) {
                advance();
                let value = "";
                while (!isEnd() && !STRING_QUOTES.includes(segments[position])) {
                    value += advance();
                }
                if (isEnd()) {
                    throw new LexerError(start.line, start.column, "もじれつが \" でとじられていません");
                }
                advance();
                createToken(TokenType.STRING, value);
                continue;
            }

            // 数値: 算用数字。小数点があれば DOUBLE
            if (isDigit(char)) {
                let value = "";
                let type = TokenType.INTEGER;
                while (!isEnd() && (isDigit(segments[position]) || isDot(segments[position]))) {
                    const c = advance();
                    if (isDot(c)) {
                        type = TokenType.DOUBLE;
                    }
                    value += normalizeDigit(c);
                }
                createToken(type, value);
                continue;
            }

            const symbol = SYMBOLS.get(char);
            if (symbol !== undefined) {
                advance();
                createToken(symbol);
                continue;
            }

            const keyword = keywords.find((k) => startsWith(k.word, k.length));
            if (keyword) {
                for (let i = 0; i < keyword.length; i++) {
                    advance();
                }
                createToken(keyword.type);
                continue;
            }

            throw new LexerError(line, column, `「${char}」はつかえないもじです。へんすうめいは「」で、もじれつは "" でかこんでください`);
        }

        tokens.push({type: TokenType.EOF, position, column, line});

        return tokens;
    }

    return {
        lex,
    }
}
