import { Contract } from "../generated/contract";

type RenderInput = {
  page: Contract.Types.PageModel;
  pageTrees: Contract.Types.PageTreeModel[];
  manifests: Contract.Types.ComponentManifest[];
  variants: Contract.Types.ComponentManifestVariant[];
};

type RenderNode = {
  pageTreeId: string;
  tagName: string;
  props: Record<string, unknown>;
  children: RenderNode[];
};

type PropsProperty =
  | Contract.Types.ComponentManifestPropsStyleProperty
  | Contract.Types.ComponentManifestPropsBehaviorProperty;

type StyleEntry = Contract.Types.ComponentManifestPropsStyle;
type BehaviorEntry = Contract.Types.ComponentManifestPropsBehavior;

function hasKind(
  prop: PropsProperty,
  kind: Contract.Enums.ComponentManifestPropsKind,
) {
  return prop.kind === kind;
}

function isStyleEntry(value: StyleEntry | BehaviorEntry): value is StyleEntry {
  return "cssProperty" in value;
}

function isBehaviorEntry(
  value: StyleEntry | BehaviorEntry,
): value is BehaviorEntry {
  return !isStyleEntry(value);
}

function readEntries(prop: PropsProperty): (StyleEntry | BehaviorEntry)[] {
  return (prop.value ?? []).filter(
    (entry): entry is StyleEntry | BehaviorEntry => !!entry && !!entry.key,
  );
}

export function mergeProps(
  ...layers: (PropsProperty[] | null | undefined)[]
): Record<string, unknown> {
  const styleByKey = new Map<string, StyleEntry>();
  const behaviorByKey = new Map<string, BehaviorEntry>();

  for (const layer of layers) {
    if (!layer) continue;

    for (const prop of layer) {
      if (hasKind(prop, Contract.Enums.ComponentManifestPropsKind.Style)) {
        for (const entry of readEntries(prop)) {
          if (isStyleEntry(entry)) {
            styleByKey.set(entry.key!, entry);
          }
        }
        continue;
      }

      if (hasKind(prop, Contract.Enums.ComponentManifestPropsKind.Behavior)) {
        for (const entry of readEntries(prop)) {
          if (isBehaviorEntry(entry)) {
            behaviorByKey.set(entry.key!, entry);
          }
        }
        continue;
      }

      // Fallback for missing kind data from API payloads.
      for (const entry of readEntries(prop)) {
        if (isStyleEntry(entry)) {
          styleByKey.set(entry.key!, entry);
          continue;
        }
        behaviorByKey.set(entry.key!, entry);
      }
    }
  }

  return {
    style: Object.fromEntries(styleByKey.entries()),
    behavior: Object.fromEntries(behaviorByKey.entries()),
  };
}

export function render(input: RenderInput): RenderNode {
  const treeById = new Map(
    input.pageTrees.filter((t) => t.id).map((t) => [t.id!, t]),
  );
  const manifestById = new Map(
    input.manifests.filter((m) => m.id).map((m) => [m.id!, m]),
  );
  const variantById = new Map(
    input.variants.filter((v) => v.id).map((v) => [v.id!, v]),
  );

  const rootId = input.page.rootPageTreeId;
  if (!rootId) throw new Error("page.rootPageTreeId is required");

  const root = treeById.get(rootId);
  if (!root) throw new Error(`root PageTreeModel not found: ${rootId}`);

  function visit(node: Contract.Types.PageTreeModel): RenderNode {
    const manifestId = node.componentManifestId;
    if (!manifestId)
      throw new Error(`componentManifestId missing on node ${node.id}`);

    const manifest = manifestById.get(manifestId);
    if (!manifest)
      throw new Error(`ComponentManifest not found: ${manifestId}`);

    const variantId = node.variantId ?? manifest.defaultVariantId ?? undefined;
    const variant = variantId ? variantById.get(variantId) : undefined;

    const props = mergeProps(
      manifest.baseProps,
      variant?.propsOverride,
      node.propsOverride,
    );

    const childIds = node.children ?? [];
    const children = childIds
      .map((id) => treeById.get(id))
      .filter((x): x is Contract.Types.PageTreeModel => !!x)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(visit);

    return {
      pageTreeId: node.id ?? "",
      tagName: manifest.tagName ?? "div",
      props,
      children,
    };
  }

  return visit(root);
}
