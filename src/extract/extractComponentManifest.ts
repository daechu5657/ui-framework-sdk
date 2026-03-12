import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, Symbol, SyntaxKind, Node } from "ts-morph";
import { defineComponent } from "../manifest/defineComponent";

function canonicalSymbol(symbol?: Symbol) {
  return symbol?.getAliasedSymbol() ?? symbol;
}

function tryResolveEnumConst(node: Node): string | number | undefined {
  if (!Node.isPropertyAccessExpression(node) && !Node.isIdentifier(node)) {
    return undefined;
  }

  const symbol = canonicalSymbol(
    node.getSymbol() ?? node.getType().getSymbol(),
  );
  if (!symbol) return undefined;

  const enumMemberDecl = symbol.getDeclarations().find(Node.isEnumMember);
  if (!enumMemberDecl) return undefined;

  return enumMemberDecl.getValue();
}

function nodeToJsonValue(node: Node): unknown {
  if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const out: Record<string, unknown> = {};
    for (const p of node.getProperties()) {
      if (Node.isPropertyAssignment(p)) {
        const key = p.getName();
        out[key] = nodeToJsonValue(p.getInitializerOrThrow());
      } else if (Node.isShorthandPropertyAssignment(p)) {
        out[p.getName()] = p.getName();
      } else {
        throw new Error(`Unsupported property kind: ${p.getKindName()}`);
      }
    }
    return out;
  }

  if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
    return node.getElements().map((el) => nodeToJsonValue(el));
  }

  if (
    node.isKind(SyntaxKind.StringLiteral) ||
    node.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  ) {
    return node.getLiteralText();
  }

  if (node.isKind(SyntaxKind.NumericLiteral)) {
    return Number(node.getText());
  }

  if (node.isKind(SyntaxKind.TrueKeyword)) return true;
  if (node.isKind(SyntaxKind.FalseKeyword)) return false;
  if (node.isKind(SyntaxKind.NullKeyword)) return null;

  if (
    node.isKind(SyntaxKind.PropertyAccessExpression) ||
    node.isKind(SyntaxKind.Identifier)
  ) {
    return tryResolveEnumConst(node);
  }

  throw new Error(
    `Unsupported initializer: ${node.getKindName()} (${node.getText()})`,
  );
}

export function extractComponentDefinition() {
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
  });
  const typeChecker = project.getTypeChecker();

  const thisFilePath = path.resolve(fileURLToPath(import.meta.url));
  const thisSourceFile =
    project.getSourceFile(thisFilePath) ??
    project.getSourceFile(
      (f) => path.resolve(f.getFilePath()) === thisFilePath,
    );

  if (!thisSourceFile) {
    throw new Error(
      `Cannot resolve current source file in ts-morph project: ${thisFilePath}`,
    );
  }

  const importSpecifier = thisSourceFile
    .getImportDeclarations()
    .flatMap((decl) => decl.getNamedImports())
    .find((namedImport) => {
      const localIdentifier =
        namedImport.getAliasNode() ?? namedImport.getNameNode();
      return localIdentifier.getText() === defineComponent.name;
    });

  if (!importSpecifier) {
    throw new Error(
      `Cannot find imported symbol for "${defineComponent.name}" in ${thisSourceFile.getBaseName()}`,
    );
  }

  const importedIdentifier =
    importSpecifier.getAliasNode() ?? importSpecifier.getNameNode();
  const importedSymbol = importedIdentifier.getSymbolOrThrow();
  const targetSymbol = canonicalSymbol(importedSymbol);
  const targetFqn = targetSymbol?.getFullyQualifiedName();

  for (const sourceFile of project.getSourceFiles()) {
    for (const callExpression of sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    )) {
      const resolvedDeclaration = typeChecker
        .getResolvedSignature(callExpression)
        ?.getDeclaration();
      const resolvedSymbol = resolvedDeclaration?.getSymbol();
      if (!resolvedSymbol) continue;

      const resolvedFqn =
        canonicalSymbol(resolvedSymbol)?.getFullyQualifiedName();
      if (resolvedFqn !== targetFqn) continue;

      if (
        callExpression
          .getExpression()
          .isKind(SyntaxKind.PropertyAccessExpression)
      ) {
        for (const arg of callExpression.getArguments()) {
          if (arg.isKind(SyntaxKind.ObjectLiteralExpression)) {
            const obj = nodeToJsonValue(arg);
            const jsonContent = JSON.stringify(obj, null, 2);
            project
              .getFileSystem()
              .writeFileSync("ast-output.json", jsonContent);
          }
        }
      }
    }
  }
}

extractComponentDefinition();
