export const orderStatusColorMap: Record<string, string> = {
  pending: "#B58900",
  processing: "#268BD2",
  shipped: "#859900",
  delivered: "#2AA198",
  completed: "#586E75",
  failed: "#DC322F",
  cancelled: "#DC322F",
};

export interface FlexContent {
  [key: string]: unknown;
}

type FlexTextWeight = "regular" | "bold";

interface FlexInfoRowOptions {
  label: string;
  text: string;
  margin?: string;
  labelFlex?: number;
  valueFlex?: number;
  valueWeight?: FlexTextWeight;
  valueColor?: string;
  wrap?: boolean;
}

export function createFlexSeparator(margin = "md"): FlexContent {
  return { type: "separator", margin };
}

export function createFlexInfoRow({
  label,
  text,
  margin,
  labelFlex = 3,
  valueFlex = 5,
  valueWeight,
  valueColor,
  wrap,
}: FlexInfoRowOptions): FlexContent {
  return {
    type: "box",
    layout: "horizontal",
    ...(margin ? { margin } : {}),
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#839496",
        flex: labelFlex,
      },
      {
        type: "text",
        text,
        size: "sm",
        ...(valueWeight ? { weight: valueWeight } : {}),
        ...(valueColor ? { color: valueColor } : {}),
        flex: valueFlex,
        ...(wrap !== undefined ? { wrap } : {}),
      },
    ],
  };
}

export function createFlexSectionTitle(text: string, margin = "md"): FlexContent {
  return {
    type: "text",
    text,
    size: "sm",
    weight: "bold",
    color: "#073642",
    margin,
  };
}
