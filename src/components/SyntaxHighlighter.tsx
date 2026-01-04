import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
}

type TokenType = 
  | "keyword" 
  | "string" 
  | "number" 
  | "comment" 
  | "function" 
  | "property" 
  | "operator" 
  | "variable" 
  | "type"
  | "text";

interface Token {
  type: TokenType;
  value: string;
}

const tokenColors: Record<TokenType, string> = {
  keyword: "text-[hsl(var(--syntax-keyword))]",
  string: "text-[hsl(var(--syntax-string))]",
  number: "text-[hsl(var(--syntax-number))]",
  comment: "text-[hsl(var(--syntax-comment))] italic",
  function: "text-[hsl(var(--syntax-function))]",
  property: "text-[hsl(var(--syntax-property))]",
  operator: "text-[hsl(var(--syntax-operator))]",
  variable: "text-[hsl(var(--syntax-variable))]",
  type: "text-[hsl(var(--syntax-type))]",
  text: "text-muted-foreground",
};

const jsKeywords = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "extends", "new", "this", "import", "export", "from", "default",
  "async", "await", "try", "catch", "throw", "finally", "typeof", "instanceof",
  "true", "false", "null", "undefined", "interface", "type", "enum", "readonly",
  "public", "private", "protected", "static", "implements", "extends", "module"
];

const pythonKeywords = [
  "def", "class", "return", "if", "elif", "else", "for", "while", "import",
  "from", "as", "try", "except", "finally", "raise", "with", "lambda", "pass",
  "break", "continue", "True", "False", "None", "and", "or", "not", "in", "is",
  "async", "await", "yield", "global", "nonlocal"
];

const shellKeywords = ["curl", "npm", "yarn", "pip", "export"];

function tokenize(code: string, language: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;

  const keywords = language === "python" 
    ? pythonKeywords 
    : language === "bash" 
    ? shellKeywords 
    : jsKeywords;

  while (remaining.length > 0) {
    let matched = false;

    // Comments
    if (language !== "json") {
      // Python/Bash comments
      if ((language === "python" || language === "bash") && remaining.startsWith("#")) {
        const endIndex = remaining.indexOf("\n");
        const comment = endIndex === -1 ? remaining : remaining.slice(0, endIndex);
        tokens.push({ type: "comment", value: comment });
        remaining = remaining.slice(comment.length);
        matched = true;
        continue;
      }
      // JS/TS comments
      if (remaining.startsWith("//")) {
        const endIndex = remaining.indexOf("\n");
        const comment = endIndex === -1 ? remaining : remaining.slice(0, endIndex);
        tokens.push({ type: "comment", value: comment });
        remaining = remaining.slice(comment.length);
        matched = true;
        continue;
      }
      if (remaining.startsWith("/*")) {
        const endIndex = remaining.indexOf("*/");
        const comment = endIndex === -1 ? remaining : remaining.slice(0, endIndex + 2);
        tokens.push({ type: "comment", value: comment });
        remaining = remaining.slice(comment.length);
        matched = true;
        continue;
      }
    }

    // Strings (double quotes)
    if (remaining[0] === '"') {
      let i = 1;
      while (i < remaining.length && remaining[i] !== '"') {
        if (remaining[i] === "\\") i++;
        i++;
      }
      const str = remaining.slice(0, i + 1);
      tokens.push({ type: "string", value: str });
      remaining = remaining.slice(str.length);
      matched = true;
      continue;
    }

    // Strings (single quotes)
    if (remaining[0] === "'") {
      let i = 1;
      while (i < remaining.length && remaining[i] !== "'") {
        if (remaining[i] === "\\") i++;
        i++;
      }
      const str = remaining.slice(0, i + 1);
      tokens.push({ type: "string", value: str });
      remaining = remaining.slice(str.length);
      matched = true;
      continue;
    }

    // Template literals
    if (remaining[0] === "`") {
      let i = 1;
      while (i < remaining.length && remaining[i] !== "`") {
        if (remaining[i] === "\\") i++;
        i++;
      }
      const str = remaining.slice(0, i + 1);
      tokens.push({ type: "string", value: str });
      remaining = remaining.slice(str.length);
      matched = true;
      continue;
    }

    // Numbers
    const numberMatch = remaining.match(/^-?\d+\.?\d*/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }

    // Keywords and identifiers
    const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (keywords.includes(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (language !== "json" && language !== "bash" && remaining.slice(word.length).match(/^\s*\(/)) {
        tokens.push({ type: "function", value: word });
      } else if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        tokens.push({ type: "type", value: word });
      } else {
        tokens.push({ type: "text", value: word });
      }
      remaining = remaining.slice(word.length);
      matched = true;
      continue;
    }

    // Property access (after dot)
    if (remaining.startsWith(".")) {
      tokens.push({ type: "operator", value: "." });
      remaining = remaining.slice(1);
      const propMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (propMatch) {
        tokens.push({ type: "property", value: propMatch[0] });
        remaining = remaining.slice(propMatch[0].length);
      }
      matched = true;
      continue;
    }

    // Operators
    const operatorMatch = remaining.match(/^(===|!==|==|!=|<=|>=|=>|->|::|&&|\|\||[+\-*/%=<>!&|^~?:])/);
    if (operatorMatch) {
      tokens.push({ type: "operator", value: operatorMatch[0] });
      remaining = remaining.slice(operatorMatch[0].length);
      matched = true;
      continue;
    }

    // Default: single character
    if (!matched) {
      tokens.push({ type: "text", value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export const SyntaxHighlighter = ({ code, language = "json" }: SyntaxHighlighterProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tokens = useMemo(() => tokenize(code, language), [code, language]);

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={tokenColors[token.type]}>
              {token.value}
            </span>
          ))}
        </code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};
