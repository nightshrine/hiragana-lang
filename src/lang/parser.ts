import {describeToken, Token, TokenType} from "./lexer.ts";

export type NodeType = "binary" | "unary" | "assign" | "integer" | "double" | "string" | "boolean" | "null" | "identifier";

export type Node = {
    type: NodeType;
    token: Token;
};

export type BinaryNode = {
    type: "binary";
    operator: TokenType.PLUS | TokenType.MINUS | TokenType.MUL | TokenType.DIV | TokenType.MOD | TokenType.EQUAL | TokenType.AND | TokenType.OR | TokenType.LT | TokenType.LE | TokenType.GT | TokenType.GE;
    left: Node;
    right: Node;
} & Node;

export type UnaryNode = {
    type: "unary";
    operator: TokenType.MINUS;
    right: Node;
} & Node;

export type LiteralNode = {
    type: "integer" | "double" | "string" | "boolean" | "null" | "identifier";
    value: number | string | boolean | null;
} & Node;

export type AssignNode = {
    type: "assign";
    operator: TokenType.ASSIGN;
    variableName: string;
    value: Node;
} & Node;

export type StatementType = "for" | "print" | "if" | "while" | "expression";

export type Statement = {
    type: StatementType;
    token: Token,
}

export type ForStatement = {
    type: "for";
    variable: string;
    start: Node;
    end: Node;
    body: Statement[];
} & Statement;

export type WhileStatement = {
    type: "while";
    condition: Node;
    body: Statement[];
} & Statement;

export type IfStatement = {
    type: "if";
    condition: Node;
    body: Statement[];
    elseIfStatements: IfStatement[];
    elseStatement: Statement[];
} & Statement;

export type PrintStatement = {
    type: "print";
    value: Node;
} & Statement;

export type ExpressionStatement = {
    type: "expression";
    expression: Node;
} & Statement;


class ParserError extends Error {
    constructor(token: Token | null, type: string, message: string) {
        // 直前に読めたトークンを「〜のあとに」の形で本文に埋め込む
        const found = token ? describeToken(token) : "";
        const quoted = found.startsWith("「") || found.startsWith('"') ? found : `「${found}」`;
        super(`[ぶんぽうえらー]${token ? ` ぎょう ${token.line}, れつ ${token.column}` : ""}：（${type}）${token ? `${quoted}のあとに` : ""}${message}`);
        this.name = "ParserError";
    }
}

type ReturnType = {
    parse: () => Statement[];
}

export default function Parser(tokens: Token[], onError: (text: string) => void): ReturnType {
    let i = 0;

    const peek = () => {
        return tokens[i];
    }

    const peekNext = () => {
        return tokens[i + 1];
    }

    const isEnd = () => {
        return peek().type === TokenType.EOF;
    }

    const previous = () => {
        return tokens[i - 1];
    }

    const advance = (): Token => {
        if (!isEnd()) {
            i++;
        }
        return previous();
    }

    const check = (type: TokenType): boolean => {
        if (isEnd()) {
            return false;
        }
        return peek().type === type;
    }

    const checkNext = (type: TokenType): boolean => {
        if (peekNext().type === TokenType.EOF) {
            return false;
        }
        return peekNext().type === type;
    }

    const match = (...types: TokenType[]): boolean => {
        for (const type of types) {
            if (check(type)) {
                advance();
                return true;
            }
        }
        return false;
    }

    const primary = (): Node => {
        // 消費せずに確認だけして、エラー位置が最初のリテラルを指すようにする
        const checkNext = () => {
            const literals = [TokenType.INTEGER, TokenType.DOUBLE, TokenType.STRING, TokenType.TRUE, TokenType.FALSE, TokenType.NULL, TokenType.IDENTIFIER];
            if (literals.some(check)) {
                throw new ParserError(previous(), "しき", "またかずやへんすうめいがつづいています。あいだに「たす」などがひつようです");
            }
        }

        if (match(TokenType.FALSE)) {
            checkNext();
            return {
                type: "boolean",
                value: false,
                token: previous(),
            } as LiteralNode;
        } else if (match(TokenType.TRUE)) {
            checkNext();
            return {
                type: "boolean",
                value: true,
                token: previous(),
            } as LiteralNode;
        } else if (match(TokenType.NULL)) {
            checkNext();
            return {
                type: "null",
                value: null,
                token: previous(),
            } as LiteralNode;
        }

        if (match(TokenType.INTEGER)) {
            checkNext();
            return {
                type: "integer",
                value: parseInt(previous().value!),
                token: previous(),
            } as LiteralNode;
        } else if (match(TokenType.DOUBLE)) {
            checkNext();
            return {
                type: "double",
                value: parseFloat(previous().value!),
                token: previous(),
            } as LiteralNode;
        } else if (match(TokenType.STRING)) {
            checkNext();
            return {
                type: "string",
                value: previous().value!,
                token: previous(),
            } as LiteralNode;
        } else if (match(TokenType.IDENTIFIER)) {
            checkNext();
            return {
                type: "identifier",
                value: previous().value!,
                token: previous(),
            } as LiteralNode;
        }

        if (match(TokenType.LPAREN)) {
            const expr = expression();
            if (!match(TokenType.RPAREN)) {
                throw new ParserError(previous(), "しき", "「)」がひつようです");
            }
            return expr;
        }

        throw new ParserError(previous(), "しき", "かずやへんすうめいなどがひつようです");
    }

    const unary = (): Node => {
        if (match(TokenType.MINUS)) {
            return {
                type: "unary",
                operator: TokenType.MINUS,
                right: unary(),
            } as UnaryNode;
        }
        return primary();
    }

    const factor = (): Node => {
        let left = unary();

        while (match(TokenType.MUL, TokenType.DIV, TokenType.MOD)) {
            const operator = previous().type;
            const right = unary();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const term = (): Node => {
        let left = factor();

        while (match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = previous().type;
            const right = factor();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const comparison = (): Node => {
        let left = term();

        while (match(TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE)) {
            const operator = previous().type;
            const right = term();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const equality = (): Node => {
        let left = comparison();

        while (match(TokenType.EQUAL)) {
            const operator = previous().type;
            const right = comparison();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const and = (): Node => {
        let left = equality();

        while (match(TokenType.AND)) {
            const operator = previous().type;
            const right = equality();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const or = (): Node => {
        let left = and();

        while (match(TokenType.OR)) {
            const operator = previous().type;
            const right = and();
            left = {
                type: "binary",
                operator,
                left,
                right,
            } as BinaryNode;
        }

        return left;
    }

    const assignment = (): Node => {
        if (check(TokenType.IDENTIFIER) && checkNext(TokenType.ASSIGN)) {
            const variableNameToken = peek();
            advance();
            advance();
            const value = expression();
            return {
                type: "assign",
                operator: TokenType.ASSIGN,
                variableName: variableNameToken.value!,
                value,
                token: variableNameToken,
            } as AssignNode;
        }

        return or();
    }

    const expression = (): Node => {
        return assignment();
    }

    const forStatement = (): ForStatement => {
        if (!match(TokenType.IDENTIFIER)) {
            throw new ParserError(previous(), "くりかえし", "へんすうめい（「」でかこむ）がひつようです");
        }
        const variable = previous();

        if (!match(TokenType.IN)) {
            throw new ParserError(previous(), "くりかえし", "「を」がひつようです");
        }

        const start = expression();

        if (!match(TokenType.TO)) {
            throw new ParserError(previous(), "くりかえし", "「から」がひつようです");
        }

        const end = expression();

        const body = block("くりかえし", "「ここから」がひつようです");

        return {
            type: "for",
            variable: variable.value!,
            start,
            end,
            body,
            token: variable,
        }
    }

    const whileStatement = (): WhileStatement => {
        const condition = expression();
        const body = block("あいだ", "「ここから」がひつようです");

        return {
            type: "while",
            condition,
            body,
            token: condition.token,
        }
    }

    const ifStatement = (): IfStatement => {
        const condition = expression();
        const body = block("もし", "「ここから」がひつようです");
        const elseIfStatements: IfStatement[] = [];

        while (match(TokenType.ELSE_IF)) {
            const condition = expression();
            const body = block("もし", "「ここから」がひつようです");
            elseIfStatements.push({
                type: "if",
                condition,
                body,
                elseIfStatements: [],
                elseStatement: [],
                token: condition.token,
            });
        }

        let elseStatement: Statement[] = [];
        if (match(TokenType.ELSE)) {
            elseStatement = block("もし", "「ここから」がひつようです");
        }

        return {
            type: "if",
            condition,
            body,
            elseIfStatements,
            elseStatement,
            token: condition.token,
        }
    }

    const printStatement = (): PrintStatement => {
        const value = expression();

        if (!match(TokenType.SEMICOLON)) {
            throw new ParserError(previous(), "みせる", "「。」がひつようです");
        }

        return {
            type: "print",
            token: value.token,
            value,
        }
    }

    const expressionStatement = (): ExpressionStatement => {
        const expr = expression();

        if (!match(TokenType.SEMICOLON)) {
            throw new ParserError(previous(), "しき", "「。」がひつようです");
        }

        return {
            type: "expression",
            expression: expr,
            token: expr.token,
        }
    }

    const statement = (): Statement | undefined => {
        if (match(TokenType.FOR)) {
            return forStatement();
        } else if (match(TokenType.IF)) {
            return ifStatement();
        } else if (match(TokenType.PRINT)) {
            return printStatement();
        } else if (match(TokenType.WHILE)) {
            return whileStatement();
        } else {
            return expressionStatement();
        }
    }

    const block = (statementType: string, message: string): Statement[] => {
        if (!match(TokenType.LBRACE)) {
            throw new ParserError(previous(), statementType, message);
        }

        const statements: Statement[] = [];
        while (!match(TokenType.RBRACE)) {
            if (isEnd()) {
                throw new ParserError(previous(), statementType, "「ここまで」がひつようです");
            }
            const stmt = statement();
            if (stmt) {
                statements.push(stmt);
            } else {
                throw new ParserError(previous(), statementType, "ぶんがひつようです");
            }
        }

        return statements;
    }

    const program = (): Statement[] => {
        const statements: Statement[] = [];
        while (!isEnd()) {
            const stmt = statement();
            if (stmt) {
                statements.push(stmt);
            } else {
                return [];
            }
        }
        return statements;
    }

    const parse = (): Statement[] => {
        try {
            return program();
        } catch (e) {
            onError((e as ParserError).message);
        }
        return [];
    }

    return {
        parse,
    }
}