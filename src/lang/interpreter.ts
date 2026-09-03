import Lexer, {LexerError, Token, TokenType} from "./lexer.ts";
import Parser, {
    AssignNode,
    BinaryNode, ExpressionStatement,
    ForStatement,
    IfStatement,
    LiteralNode,
    Node,
    PrintStatement,
    Statement,
    UnaryNode, WhileStatement
} from "./parser.ts";

class RuntimeError extends Error {
    constructor(token: Token | null, message: string) {
        super(`[じっこうえらー]${token ? ` ぎょう ${token.line}, れつ ${token.column}` : ""}：${message}`);
        this.name = "RuntimeError";
    }
}

type ReturnType = {
    launch: () => void;
}

export default function Interpreter(program: string, stdOut: (text: string) => void, stdError: (text: string) => void): ReturnType {

    const variables: Record<string, string | number | boolean | null> = {};

    const interpretBinary = (node: BinaryNode): string | number | boolean | null => {
        const left = interpretNode(node.left);
        const right = interpretNode(node.right);

        if (typeof left === "string" && typeof right === "string") {
            switch (node.operator) {
                case TokenType.PLUS:
                    return left + right;
            }
        } else if (typeof left === "number" && typeof right === "number") {
            switch (node.operator) {
                case TokenType.PLUS:
                    return left + right;
                case TokenType.MINUS:
                    return left - right;
                case TokenType.MUL:
                    return left * right;
                case TokenType.DIV:
                    return left / right;
                case TokenType.MOD:
                    return left % right;
                case TokenType.EQUAL:
                    return left == right;
                case TokenType.LT:
                    return left < right;
                case TokenType.LE:
                    return left <= right;
                case TokenType.GT:
                    return left > right;
                case TokenType.GE:
                    return left >= right;
            }
        } else if (typeof left === "boolean" && typeof right === "boolean") {
            switch (node.operator) {
                case TokenType.EQUAL:
                    return left == right;
                case TokenType.AND:
                    return left && right;
                case TokenType.OR:
                    return left || right;
            }
        }

        throw new RuntimeError(node.token, "けいさんのひだりとみぎはおなじしゅるいのあたいにしてください");
    }

    const interpretUnary = (node: UnaryNode): number => {
        const right = interpretNode(node.right);

        if (typeof right !== "number") {
            throw new RuntimeError(node.token, "「ひく」のあとはかずにしてください");
        }

        switch (node.operator) {
            case TokenType.MINUS:
                return -right;
        }
    }

    const interpretAssignNode = (node: AssignNode): string | number | boolean | null => {
        const value = interpretNode(node.value);
        variables[node.variableName] = value;

        return value;
    }

    const interpretNode = (node: Node): string | number | boolean | null => {
        switch (node.type) {
            case "string":
            case "integer":
            case "double":
            case "null":
            case "boolean":
                return (node as LiteralNode).value;
            case "identifier": {
                const name = (node as LiteralNode).value as string;
                if (Object.keys(variables).indexOf(name) === -1) {
                    throw new RuntimeError((node as LiteralNode).token, `へんすう「${name}」はまだつくられていません`);
                }
                return variables[name];
            }
            case "binary":
                return interpretBinary(node as BinaryNode);
            case "unary":
                return interpretUnary(node as UnaryNode);
            case "assign":
                return interpretAssignNode(node as AssignNode);
        }
    }

    const interpretFor = (statement: ForStatement) => {
        const start = interpretNode(statement.start);
        const end = interpretNode(statement.end);

        if (typeof start !== "number" || typeof end !== "number") {
            throw new RuntimeError(statement.token, "「くりかえし」のはじめとおわりはかずにしてください");
        }

        variables[statement.variable] = start;

        for (let i = start; i <= end; i++) {
            interpret(statement.body);
            (variables[statement.variable] as number)++;
        }

        delete variables[statement.variable];
    }

    const interpretIf = (statement: IfStatement) => {
        if (interpretNode(statement.condition)) {
            interpret(statement.body);
        } else {
            for (const elseIfStatement of statement.elseIfStatements) {
                if (interpretNode(elseIfStatement.condition)) {
                    interpret(elseIfStatement.body);
                    return;
                }
            }
            interpret(statement.elseStatement);
        }
    }

    const interpretWhile = (statement: WhileStatement) => {
        while (interpretNode(statement.condition)) {
            interpret(statement.body);
        }
    }

    // 真偽値と null は言語側の表記で表示する
    const stringify = (value: string | number | boolean | null): string => {
        if (value === null) {
            return "なし";
        }
        if (typeof value === "boolean") {
            return value ? "ほんとう" : "うそ";
        }
        return `${value}`;
    }

    const interpretExpression = (statement: ExpressionStatement) => {
        interpretNode(statement.expression);
    }

    const interpret = (statements: Statement[]) => {
        try {
            for (const statement of statements) {
                switch (statement.type) {
                    case "print":
                        stdOut(stringify(interpretNode((statement as PrintStatement).value)));
                        break;
                    case "for":
                        interpretFor(statement as ForStatement);
                        break;
                    case "if":
                        interpretIf(statement as IfStatement);
                        break;
                    case "while":
                        interpretWhile(statement as WhileStatement);
                        break;
                    case "expression":
                        interpretExpression((statement as ExpressionStatement));
                }
            }
        } catch (e) {
            if (e instanceof RuntimeError) {
                stdError(e.message);
                throw new Error();
            }
        }
    }

    const launch = () => {
        let tokens: Token[];
        try {
            tokens = Lexer(program).lex();
        } catch (e) {
            if (e instanceof LexerError) {
                stdError(e.message);
                throw new Error();
            }
            throw e;
        }

        const parser = Parser(tokens, stdError);
        const statements = parser.parse();
        if (statements) {
            interpret(statements);
        }
    }

    return {
        launch,
    }
}