import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scientific Calculator" },
      { name: "description", content: "A clean, white scientific calculator with radian mode." },
      { property: "og:title", content: "Scientific Calculator" },
      { property: "og:description", content: "A clean, white scientific calculator with radian mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; name: string }
  | { type: "op"; op: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "eof" };

const FUNCTIONS = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt"]);
const CONSTANTS = new Set(["pi", "π", "e"]);

function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0) return NaN;
  if (n > 170) return Infinity;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/\d/.test(c)) {
      let j = i;
      while (j < input.length && /[\d.]/.test(input[j]!)) j++;
      const value = parseFloat(input.slice(i, j));
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Zπ]/.test(input[j]!)) j++;
      tokens.push({ type: "ident", name: input.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^!%".includes(c)) {
      tokens.push({ type: "op", op: c });
      i++;
      continue;
    }
    if (c === "(" || c === ")") {
      tokens.push({ type: "paren", value: c });
      i++;
      continue;
    }
    i++;
  }
  tokens.push({ type: "eof" });
  return tokens;
}

function evaluate(expression: string, isRad: boolean): string {
  const normalized = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
  const tokens = tokenize(normalized);
  let pos = 0;
  const peek = () => tokens[pos] as Token;
  const consume = () => tokens[pos++] as Token;

  function applyFunction(name: string, arg: number): number {
    switch (name) {
      case "sin":
        return Math.sin(isRad ? arg : (arg * Math.PI) / 180);
      case "cos":
        return Math.cos(isRad ? arg : (arg * Math.PI) / 180);
      case "tan":
        return Math.tan(isRad ? arg : (arg * Math.PI) / 180);
      case "asin":
        return isRad ? Math.asin(arg) : (Math.asin(arg) * 180) / Math.PI;
      case "acos":
        return isRad ? Math.acos(arg) : (Math.acos(arg) * 180) / Math.PI;
      case "atan":
        return isRad ? Math.atan(arg) : (Math.atan(arg) * 180) / Math.PI;
      case "log":
        return Math.log10(arg);
      case "ln":
        return Math.log(arg);
      case "sqrt":
        return Math.sqrt(arg);
      default:
        return NaN;
    }
  }

  function applyBinary(op: string, left: number, right: number): number {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "^":
        return Math.pow(left, right);
      case "%":
        return left % right;
      default:
        return NaN;
    }
  }

  function precedence(op: string): number {
    switch (op) {
      case "^":
        return 4;
      case "*":
      case "/":
      case "%":
        return 3;
      case "+":
      case "-":
        return 2;
      default:
        return 0;
    }
  }

  function parseAtom(): number {
    const tok = consume();
    if (tok.type === "num") {
      let value = tok.value;
      const next = peek();
      if (next.type === "op" && next.op === "!") {
        consume();
        value = factorial(value);
      }
      return value;
    }
    if (tok.type === "ident") {
      let value: number;
      if (tok.name === "π" || tok.name === "pi") value = Math.PI;
      else if (tok.name === "e") value = Math.E;
      else if (FUNCTIONS.has(tok.name)) {
        const next = peek();
        if (next.type === "paren" && next.value === "(") {
          consume();
          const arg = parseExpression();
          consume();
          value = applyFunction(tok.name, arg);
        } else {
          value = NaN;
        }
      } else {
        value = NaN;
      }
      const after = peek();
      if (after.type === "op" && after.op === "!") {
        consume();
        value = factorial(value);
      }
      return value;
    }
    if (tok.type === "paren" && tok.value === "(") {
      const value = parseExpression();
      consume();
      const after = peek();
      if (after.type === "op" && after.op === "!") {
        consume();
        return factorial(value);
      }
      return value;
    }
    if (tok.type === "op" && tok.op === "-") return -parseAtom();
    if (tok.type === "op" && tok.op === "+") return parseAtom();
    return NaN;
  }

  function parseExpression(minPrec = 0): number {
    let left = parseAtom();
    while (true) {
      const tok = peek();
      if (tok.type !== "op" || tok.op === "!") break;
      const prec = precedence(tok.op);
      if (prec < minPrec) break;
      const assoc = tok.op === "^" ? 0 : 1;
      consume();
      const right = parseExpression(prec + assoc);
      left = applyBinary(tok.op, left, right);
    }
    return left;
  }

  try {
    const result = parseExpression();
    if (!Number.isFinite(result)) return "Error";
    return parseFloat(result.toFixed(10)).toString();
  } catch {
    return "Error";
  }
}

function Index() {
  const [display, setDisplay] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isRad, setIsRad] = useState(true);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const preview = useMemo(() => {
    if (!display) return "";
    const result = evaluate(display, isRad);
    return result === "Error" ? "" : result;
  }, [display, isRad]);

  function insert(value: string) {
    if (justEvaluated && /^[\dπe]$/.test(value)) {
      setDisplay(value);
    } else {
      setDisplay((prev) => prev + value);
    }
    setJustEvaluated(false);
  }

  function backspace() {
    if (justEvaluated) {
      setDisplay("");
    } else {
      setDisplay((prev) => prev.slice(0, -1));
    }
    setJustEvaluated(false);
  }

  function clear() {
    setDisplay("");
    setLastResult(null);
    setJustEvaluated(false);
  }

  function calculate() {
    if (!display) return;
    const result = evaluate(display, isRad);
    setLastResult(`${display} = ${result}`);
    setDisplay(result === "Error" ? "" : result);
    setJustEvaluated(true);
  }

  function toggleSign() {
    setDisplay((prev) => {
      if (!prev) return "-";
      if (prev.startsWith("-")) return prev.slice(1);
      return `(-${prev})`;
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") insert(e.key);
      else if (e.key === ".") insert(".");
      else if (e.key === "+") insert("+");
      else if (e.key === "-") insert("-");
      else if (e.key === "*") insert("×");
      else if (e.key === "/") insert("÷");
      else if (e.key === "^") insert("^");
      else if (e.key === "(") insert("(");
      else if (e.key === ")") insert(")");
      else if (e.key === "!") insert("!");
      else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculate();
      } else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clear();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [display, isRad]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-calc-surface text-calc-surface-foreground rounded-[2rem] shadow-[0_24px_60px_-12px_var(--calc-shadow)] p-5 sm:p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-sm font-semibold tracking-wide text-calc-muted-foreground uppercase">
              Scientific
            </h1>
            <div className="flex bg-calc-muted rounded-full p-1">
              <button
                onClick={() => setIsRad(true)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-colors",
                  isRad ? "bg-calc-surface text-calc-accent shadow-sm" : "text-calc-muted-foreground"
                )}
              >
                RAD
              </button>
              <button
                onClick={() => setIsRad(false)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-colors",
                  !isRad ? "bg-calc-surface text-calc-accent shadow-sm" : "text-calc-muted-foreground"
                )}
              >
                DEG
              </button>
            </div>
          </div>

          <div className="bg-calc-display rounded-3xl p-5 mb-6 shadow-inner ring-1 ring-border/30">
            {lastResult && (
              <div className="text-right text-xs text-calc-muted-foreground mb-2 truncate">
                {lastResult}
              </div>
            )}
            <div className="text-right text-3xl sm:text-4xl font-medium text-calc-display-foreground break-all min-h-[2.5rem]">
              {display || "0"}
            </div>
            <div className="text-right text-lg text-calc-accent h-7 mt-1 truncate">
              {preview && preview !== display ? preview : ""}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <CalcButton label="sin" onClick={() => insert("sin(")} muted />
            <CalcButton label="cos" onClick={() => insert("cos(")} muted />
            <CalcButton label="tan" onClick={() => insert("tan(")} muted />
            <CalcButton label="log" onClick={() => insert("log(")} muted />
            <CalcButton label="ln" onClick={() => insert("ln(")} muted />

            <CalcButton label="x²" onClick={() => insert("^2")} muted />
            <CalcButton label="xʸ" onClick={() => insert("^")} muted />
            <CalcButton label="√" onClick={() => insert("sqrt(")} muted />
            <CalcButton label="(" onClick={() => insert("(")} muted />
            <CalcButton label=")" onClick={() => insert(")")} muted />

            <CalcButton label="7" onClick={() => insert("7")} />
            <CalcButton label="8" onClick={() => insert("8")} />
            <CalcButton label="9" onClick={() => insert("9")} />
            <CalcButton label="DEL" onClick={backspace} operator className="text-calc-accent" />
            <CalcButton label="AC" onClick={clear} operator className="text-calc-accent" />

            <CalcButton label="4" onClick={() => insert("4")} />
            <CalcButton label="5" onClick={() => insert("5")} />
            <CalcButton label="6" onClick={() => insert("6")} />
            <CalcButton label="×" onClick={() => insert("×")} operator />
            <CalcButton label="÷" onClick={() => insert("÷")} operator />

            <CalcButton label="1" onClick={() => insert("1")} />
            <CalcButton label="2" onClick={() => insert("2")} />
            <CalcButton label="3" onClick={() => insert("3")} />
            <CalcButton label="+" onClick={() => insert("+")} operator />
            <CalcButton label="-" onClick={() => insert("-")} operator />

            <CalcButton label="0" onClick={() => insert("0")} />
            <CalcButton label="." onClick={() => insert(".")} />
            <CalcButton label="π" onClick={() => insert("π")} />
            <CalcButton label="±" onClick={toggleSign} operator />
            <CalcButton label="=" onClick={calculate} accent />
          </div>
        </div>
      </div>
    </div>
  );
}

function CalcButton({
  label,
  onClick,
  muted,
  operator,
  accent,
  className,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  operator?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "h-14 text-lg font-semibold rounded-2xl shadow-[0_1px_2px_0_var(--calc-shadow)] active:translate-y-[1px] active:shadow-none transition-all",
        muted &&
          "bg-calc-muted text-calc-muted-foreground hover:bg-calc-key-active hover:text-calc-key-foreground",
        operator &&
          "bg-calc-operator text-calc-operator-foreground hover:bg-calc-key-active",
        accent &&
          "bg-calc-accent text-calc-accent-foreground hover:bg-calc-accent/90 shadow-[0_4px_14px_-4px_var(--calc-accent)]",
        !muted && !operator && !accent &&
          "bg-calc-key text-calc-key-foreground hover:bg-calc-key-active",
        className
      )}
    >
      {label}
    </Button>
  );
}
