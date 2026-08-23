import { StyleSheet, View } from "react-native";

import { Palette } from "@/constants/theme";

export function MiniBottle({ height }: { height: number }) {
  return (
    <View style={[styles.bottle, { height }]}>
      <View style={styles.neck} />
      <View style={styles.body}>
        <View style={styles.label} />
      </View>
    </View>
  );
}

const SHELF_POSITIONS = ["left", "center", "right"] as const;

export function BottleShelf({
  heights = [112, 138, 96],
}: {
  heights?: readonly [number, number, number];
}) {
  return (
    <View style={styles.shelf}>
      {heights.map((height, index) => (
        <MiniBottle height={height} key={SHELF_POSITIONS[index]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    backgroundColor: Palette.white,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flex: 1,
    justifyContent: "center",
    width: 34,
  },
  bottle: {
    alignItems: "center",
    justifyContent: "flex-end",
    opacity: 0.32,
    width: 34,
  },
  label: {
    backgroundColor: Palette.lilac,
    borderRadius: 2,
    height: 32,
    width: 26,
  },
  neck: {
    backgroundColor: Palette.white,
    height: 23,
    width: 13,
  },
  shelf: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    paddingBottom: 0,
    width: "100%",
  },
});
