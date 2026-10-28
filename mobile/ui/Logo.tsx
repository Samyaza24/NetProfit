import { Image } from "react-native";

// logo.png is 1200x320.
const RATIO = 1200 / 320;

export default function Logo({ height = 40 }: { height?: number }) {
  return (
    <Image
      source={require("../assets/logo.png")}
      style={{ height, width: height * RATIO }}
      resizeMode="contain"
      accessibilityLabel="NetProfit"
    />
  );
}
