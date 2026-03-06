export namespace Contract {
    export namespace Enums {
        export enum ComponentManifestPropsKind {
            Style = 0,
            Behavior = 1
        }

        export enum ComponentManifestPropsStyleValueKind {
            Unset = 0,
            Literal = 1,
            DesignToken = 2
        }

        export enum StyleValueType {
            String = 0,
            Number = 1
        }

        export enum StyleValueUnit {
            Px = 0,
            Rem = 1,
            Percent = 2
        }
    }

    export namespace Types {
        export interface ComponentManifestDefinition {
            name: string | null;
            tagName: string | null;
            baseProps: | (
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

        export interface ComponentManifestPropsBehaviorDefinition {
            key: string | null;
        }

        export type ComponentManifestPropsBehaviorPropertyDefinition = {
                  kind?: Enums.ComponentManifestPropsKind;
                  value?:
                    | ComponentManifestPropsBehaviorDefinition[]
                    | null;
                } & ComponentManifestPropsDefinition;

        export interface ComponentManifestPropsDefinition {
            kind?: Enums.ComponentManifestPropsKind;
        }

        export interface ComponentManifestPropsStyleDefinition {
            key: string | null;
            name: string | null;
            cssProperty: string | null;
            valueType: Enums.StyleValueType;
            unit?: Enums.StyleValueUnit;
        }

        export type ComponentManifestPropsStylePropertyDefinition = {
                  kind?: Enums.ComponentManifestPropsKind;
                  value?:
                    | ComponentManifestPropsStyleDefinition[]
                    | null;
                } & ComponentManifestPropsDefinition;
    }
}
