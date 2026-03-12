import * as SDK from "../src";

const button = SDK.defineComponent({
  name: "button",
  tagName: "button",
  baseProps: [
    {
      kind: SDK.Contract.Enums.ComponentManifestPropsKind.Behavior,
      value: [],
    },
  ],
  variants: ["default", "disabled", "submit"],
  variantOverrides: {
    default: [
      {
        kind: SDK.Contract.Enums.ComponentManifestPropsKind.Style,
        value: [],
      },
    ],
    disabled: [
      {
        kind: SDK.Contract.Enums.ComponentManifestPropsKind.Style,
        value: [],
      },
    ],
    submit: [
      {
        kind: SDK.Contract.Enums.ComponentManifestPropsKind.Style,
        value: [],
      },
    ],
  },
});
