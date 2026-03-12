export namespace Contract {
  export namespace Enums {
    export enum ComponentManifestPropsKind {
      Style = 0,
      Behavior = 1,
    }

    export enum ComponentManifestPropsStyleValueKind {
      Unset = 0,
      Literal = 1,
      DesignToken = 2,
    }

    export enum StyleValueType {
      String = 0,
      Number = 1,
    }

    export enum StyleValueUnit {
      Px = 0,
      Rem = 1,
      Percent = 2,
    }
  }

  export namespace Types {
    export interface ComponentManifest {
      id?: string | null;
      projectId: string | null;
      defaultVariantId: string | null;
      variantIds: string[] | null;
      baseProps:
        | (
            | ComponentManifestPropsStyleProperty
            | ComponentManifestPropsBehaviorProperty
          )[]
        | null;
      tagName: string | null;
      name: string | null;
      createdTime?: string;
      updatedTime?: string;
      deletedTime?: string | null;
    }

    export interface ComponentManifestDefinition {
      name: string | null;
      tagName: string | null;
      baseProps:
        | (
            | ComponentManifestPropsStylePropertyDefinition
            | ComponentManifestPropsBehaviorPropertyDefinition
          )[]
        | null;
      variants: string[] | null;
      variantOverrides?: {
        [key: string]: (
          | ComponentManifestPropsStylePropertyDefinition
          | ComponentManifestPropsBehaviorPropertyDefinition
        )[];
      } | null;
    }

    export interface ComponentManifestProps {
      kind?: Enums.ComponentManifestPropsKind;
    }

    export interface ComponentManifestPropsBehavior {
      key: string | null;
    }

    export interface ComponentManifestPropsBehaviorDefinition {
      key: string | null;
    }

    export type ComponentManifestPropsBehaviorProperty = {
      kind?: Enums.ComponentManifestPropsKind;
      value?: ComponentManifestPropsBehavior[] | null;
    } & ComponentManifestProps;
    export type ComponentManifestPropsBehaviorPropertyDefinition = {
      kind?: Enums.ComponentManifestPropsKind;
      value?: ComponentManifestPropsBehaviorDefinition[] | null;
    } & ComponentManifestPropsDefinition;

    export interface ComponentManifestPropsDefinition {
      kind?: Enums.ComponentManifestPropsKind;
    }

    export interface ComponentManifestPropsStyle {
      designTokenIds: string[] | null;
      key: string | null;
      name: string | null;
      cssProperty: string | null;
      valueType: Enums.StyleValueType;
      value: ComponentManifestPropsStyleValue;
      unit?: Enums.StyleValueUnit;
    }

    export interface ComponentManifestPropsStyleDefinition {
      key: string | null;
      name: string | null;
      cssProperty: string | null;
      valueType: Enums.StyleValueType;
      unit?: Enums.StyleValueUnit;
    }

    export type ComponentManifestPropsStyleProperty = {
      kind?: Enums.ComponentManifestPropsKind;
      value?: ComponentManifestPropsStyle[] | null;
    } & ComponentManifestProps;
    export type ComponentManifestPropsStylePropertyDefinition = {
      kind?: Enums.ComponentManifestPropsKind;
      value?: ComponentManifestPropsStyleDefinition[] | null;
    } & ComponentManifestPropsDefinition;

    export interface ComponentManifestPropsStyleValue {
      designTokenId?: string | null;
      designTokenValueId?: string | null;
      kind: Enums.ComponentManifestPropsStyleValueKind;
      valueType: Enums.StyleValueType;
      stringValue?: string | null;
      numberValue?: number | null;
    }

    export interface ComponentManifestVariant {
      id?: string | null;
      projectId: string | null;
      componentManifestId: string | null;
      propsOverride:
        | (
            | ComponentManifestPropsStyleProperty
            | ComponentManifestPropsBehaviorProperty
          )[]
        | null;
      key: string | null;
      name: string | null;
      order?: number;
      createdTime?: string;
      updatedTime?: string;
      deletedTime?: string | null;
    }

    export interface PageModel {
      id?: string | null;
      projectId?: string | null;
      spaceId?: string | null;
      rootPageTreeId?: string | null;
      name?: string | null;
      order?: number;
      createdTime?: string;
      updatedTime?: string;
      deletedTime?: string | null;
    }

    export interface PageTreeModel {
      id?: string | null;
      projectId?: string | null;
      pageId?: string | null;
      componentManifestId?: string | null;
      variantId?: string | null;
      name?: string | null;
      order?: number;
      parent?: string | null;
      children?: string[] | null;
      propsOverride?:
        | (
            | ComponentManifestPropsStyleProperty
            | ComponentManifestPropsBehaviorProperty
          )[]
        | null;
      createdTime?: string;
      updatedTime?: string;
      deletedTime?: string | null;
    }
  }
}
