import { Image, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";

// logo.png is 1200x320: the app icon on the left (320 wide) and the dark "NetProfit" lettering.
const RATIO = 1200 / 320;

export default function Logo({ height = 40 }: { height?: number }) {
  const { dark, colors } = useTheme();
  const source = require("../assets/logo.png");

  if (!dark) {
    return <Image source={source} style={{ height, width: height * RATIO }} resizeMode="contain" accessibilityLabel="NetProfit" />;
  }

  // The lettering in the picture is near-black, so on a dark screen only the icon is cut from it and the name is drawn as text.
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: height * 0.14 }} accessible accessibilityLabel="NetProfit">
      <View style={{ width: height, height, overflow: "hidden" }}>
        <Image source={source} style={{ height, width: height * RATIO }} resizeMode="contain" />
      </View>
      <Text style={{ fontSize: height * 0.62, fontWeight: "800", color: colors.text }}>
        Net<Text style={{ color: colors.accent }}>Profit</Text>
      </Text>
    </View>
  );
}
