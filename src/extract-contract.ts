import {
  Project,
  PropertySignature,
  SyntaxKind,
  TypeNode,
  InterfaceDeclaration,
} from "ts-morph";

async function main() {
  // 1) 입력 파일(schema.ts) 로드 + 출력 파일 준비
  const project = new Project({});
  const src = project.addSourceFileAtPath("./generated/schema.ts");
  const out = project.createSourceFile("./generated/contract.ts", "", {
    overwrite: true,
  });

  // 2) components.schemas 타입 리터럴 추출
  const components = src.getInterfaceOrThrow("components");
  const schemasTypeNode = components
    .getPropertyOrThrow("schemas")
    .getTypeNodeOrThrow()
    .asKindOrThrow(SyntaxKind.TypeLiteral);

  // 3) schema 이름 -> PropertySignature 빠른 조회용 맵
  const schemaProps = new Map(
    schemasTypeNode.getProperties().map((p) => [p.getName(), p] as const),
  );

  // 4) 수집 결과 저장소(중복 방지용 Set)
  const collectedSchemas = new Set<string>();
  const visitedSchemas = new Set<string>();
  const collectedEnums = new Set<string>();
  const collectedInterfaces = new Set<string>();
  const collectedTypeAliases = new Set<string>();

  // 타입 문자열의 components["schemas"]["X"]를 X(또는 Enums.X)로 치환
  function normalizeTypeText(typeText: string): string {
    return typeText.replace(
      /components\["schemas"\]\["([^"]+)"\]/g,
      (_, name: string) => {
        if (src.getEnum(name)) return `Enums.${name}`;
        return name;
      },
    );
  }

  // 타입 문자열에서 components["schemas"]["X"] 패턴의 X들을 추출
  function extractSchemaNameFromText(typeText: string): string[] {
    const matches = [
      ...typeText.matchAll(/components\["schemas"\]\["([^"]+)"\]/g),
    ];
    return matches.map((m) => m[1]);
  }

  // 인터페이스 선언을 수집하고, 멤버 타입을 재귀 수집
  function collectFromInterface(name: string) {
    if (collectedInterfaces.has(name)) return;

    const iface = src.getInterface(name);
    if (!iface) return;

    collectedInterfaces.add(name);

    for (const p of iface.getProperties()) {
      const tn = p.getTypeNode();
      if (tn) collectFromTypeNode(tn);
    }

    for (const idx of iface.getIndexSignatures()) {
      const tn = idx.getReturnTypeNode();
      if (tn) collectFromTypeNode(tn);
    }
  }

  // 타입 별칭 선언을 수집하고, 별칭 대상 타입을 재귀 수집
  function collectFromTypeAlias(name: string) {
    if (collectedTypeAliases.has(name)) return;

    const alias = src.getTypeAlias(name);
    if (!alias) return;

    collectedTypeAliases.add(name);
    const tn = alias.getTypeNode();
    if (tn) collectFromTypeNode(tn);
  }

  // 핵심 재귀 탐색기: TypeNode를 내려가며 의존 타입을 수집
  function collectFromTypeNode(typeNode: TypeNode): void {
    // 문자열 패턴 기반 schema 참조 먼저 수집
    const schemaRefs = extractSchemaNameFromText(typeNode.getText());
    for (const schemaName of schemaRefs) {
      collectFromSchema(schemaName);
    }

    // Union: 각 멤버를 재귀 탐색
    if (typeNode.isKind(SyntaxKind.UnionType)) {
      for (const t of typeNode
        .asKindOrThrow(SyntaxKind.UnionType)
        .getTypeNodes()) {
        collectFromTypeNode(t);
      }
      return;
    }

    // Array: element 타입 재귀 탐색
    if (typeNode.isKind(SyntaxKind.ArrayType)) {
      collectFromTypeNode(
        typeNode.asKindOrThrow(SyntaxKind.ArrayType).getElementTypeNode(),
      );
      return;
    }

    // Parenthesized: 내부 타입 재귀 탐색
    if (typeNode.isKind(SyntaxKind.ParenthesizedType)) {
      collectFromTypeNode(
        typeNode.asKindOrThrow(SyntaxKind.ParenthesizedType).getTypeNode(),
      );
      return;
    }

    // Tuple: 각 요소 타입 재귀 탐색
    if (typeNode.isKind(SyntaxKind.TupleType)) {
      for (const e of typeNode
        .asKindOrThrow(SyntaxKind.TupleType)
        .getElements()) {
        collectFromTypeNode(e);
      }
      return;
    }

    // TypeLiteral: property/index signature의 타입들을 재귀 탐색
    if (typeNode.isKind(SyntaxKind.TypeLiteral)) {
      const tl = typeNode.asKindOrThrow(SyntaxKind.TypeLiteral);

      for (const p of tl.getProperties()) {
        const tn = p.getTypeNode();
        if (tn) collectFromTypeNode(tn);
      }

      for (const idx of tl.getIndexSignatures()) {
        const tn = idx.getReturnTypeNode();
        if (tn) collectFromTypeNode(tn);
      }
      return;
    }

    // TypeReference: enum/interface/typeAlias 선언으로 분기해서 수집
    if (typeNode.isKind(SyntaxKind.TypeReference)) {
      const refName = typeNode
        .asKindOrThrow(SyntaxKind.TypeReference)
        .getTypeName()
        .getText();

      if (src.getEnum(refName)) {
        collectedEnums.add(refName);
      } else if (src.getInterface(refName)) {
        collectFromInterface(refName);
      } else if (src.getTypeAlias(refName)) {
        collectFromTypeAlias(refName);
      }

      for (const arg of typeNode
        .asKindOrThrow(SyntaxKind.TypeReference)
        .getTypeArguments()) {
        collectFromTypeNode(arg);
      }
      return;
    }
  }

  // schema 이름 하나를 시작점으로 해당 schema 타입 의존성을 수집
  function collectFromSchema(schemaName: string): void {
    collectedSchemas.add(schemaName);

    // 순환 참조 방지
    if (visitedSchemas.has(schemaName)) return;
    visitedSchemas.add(schemaName);

    const prop = schemaProps.get(schemaName);
    const tn = prop?.getTypeNode();
    if (!tn) return;

    collectFromTypeNode(tn);
  }

  // 5) 시작점: schemas 전체를 대상으로 수집
  for (const schemaName of schemaProps.keys()) {
    collectFromSchema(schemaName);
  }

  // 6) 출력 네임스페이스 생성
  const rootNs = out.addModule({ name: "Contract", isExported: true });
  const enumsNs = rootNs.addModule({ name: "Enums", isExported: true });
  const typesNs = rootNs.addModule({ name: "Types", isExported: true });

  // 7) 수집된 enum 출력
  for (const e of src.getEnums()) {
    const name = e.getName();
    if (collectedEnums.has(name) || collectedSchemas.has(name)) {
      enumsNs.addEnum(e.getStructure());
    }
  }

  // TypeLiteral schema를 interface 구조로 변환
  function interfaceMembersFromTypeLiteral(prop: PropertySignature) {
    const tn = prop.getTypeNodeOrThrow().asKindOrThrow(SyntaxKind.TypeLiteral);

    return {
      properties: tn.getProperties().map((p) => ({
        name: p.getName(),
        type: normalizeTypeText(p.getTypeNodeOrThrow().getText()),
        hasQuestionToken: p.hasQuestionToken(),
        isReadonly: p.isReadonly(),
      })),
      indexSignatures: tn.getIndexSignatures().map((idx) => ({
        keyName: idx.getKeyName(),
        keyType: idx.getKeyTypeNode()?.getText() ?? "string",
        returnType: normalizeTypeText(idx.getReturnTypeNodeOrThrow().getText()),
      })),
    };
  }

  // 8) schemas 항목을 Types에 interface/type alias로 출력
  for (const p of schemasTypeNode.getProperties()) {
    const name = p.getName();
    if (!collectedSchemas.has(name)) continue;

    const tn = p.getTypeNode();
    if (!tn) continue;

    if (src.getEnum(name)) continue;

    if (tn.isKind(SyntaxKind.TypeLiteral)) {
      const members = interfaceMembersFromTypeLiteral(p);
      typesNs.addInterface({
        name,
        isExported: true,
        properties: members.properties,
        indexSignatures: members.indexSignatures,
      });
      continue;
    }

    typesNs.addTypeAlias({
      name,
      isExported: true,
      type: normalizeTypeText(tn.getText()),
    });
  }

  // src 인터페이스 선언을 Types로 복사(중복 방지)
  function emitInterfaceDeclaration(iface: InterfaceDeclaration) {
    const name = iface.getName();
    if (typesNs.getInterface(name) || typesNs.getTypeAlias(name)) return;

    typesNs.addInterface({
      name,
      isExported: true,
      properties: iface.getProperties().map((p) => ({
        name: p.getName(),
        hasQuestionToken: p.hasQuestionToken(),
        isReadonly: p.isReadonly(),
        type: normalizeTypeText(p.getTypeNodeOrThrow().getText()),
      })),
      indexSignatures: iface.getIndexSignatures().map((idx) => ({
        keyName: idx.getKeyName(),
        keyType: idx.getKeyTypeNode()?.getText() ?? "string",
        returnType: normalizeTypeText(idx.getReturnTypeNodeOrThrow().getText()),
      })),
    });
  }

  // 9) 수집된 interface/type alias 추가 출력
  for (const i of src.getInterfaces()) {
    if (collectedInterfaces.has(i.getName())) {
      emitInterfaceDeclaration(i);
    }
  }

  for (const t of src.getTypeAliases()) {
    const name = t.getName();
    if (!collectedTypeAliases.has(name)) continue;
    if (typesNs.getInterface(name) || typesNs.getTypeAlias(name)) continue;

    typesNs.addTypeAlias({
      name,
      isExported: true,
      type: normalizeTypeText(t.getTypeNodeOrThrow().getText()),
    });
  }

  // 10) 파일 저장
  await project.save();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
