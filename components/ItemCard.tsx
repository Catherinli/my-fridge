import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

type Item = {
  id: number | string;
  name: string;
  tag?: string;
  qty?: number;
  daysAgo?: number;
};

type ItemCardProps = {
  item: Item;
  onIncrease?: () => void;
  onDecrease?: () => void;
  onDelete?: () => void;
  cardWidth?: number;
};

export default function ItemCard({ item, onIncrease, onDecrease, onDelete, cardWidth }: ItemCardProps) {
  // refs for hold-to-repeat timers
  const holdTimeout = useRef<any>(null);
  const holdInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (holdTimeout.current) clearTimeout(holdTimeout.current);
      if (holdInterval.current) clearInterval(holdInterval.current);
    };
  }, []);

  const startContinuous = (fn?: (() => void) | undefined) => {
    if (!fn) return;
    // immediate first action
    fn();
    // after a short delay, start interval
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(() => {
        fn();
      }, 160); // repeat every 160ms while holding
    }, 400); // start repeating after 400ms
  };

  const stopContinuous = () => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  };

  return (
    <View style={[styles.card, { width: cardWidth ?? 140 }]}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {/* 增加数量的按钮，紧贴卡片右上角，按下时显示虚框；支持按住连续增加 */}
        <Pressable
          onPressIn={() => startContinuous(onIncrease)}
          onPressOut={stopContinuous}
          android_ripple={{ color: '#cfe6ff', radius: 20 }}
          style={({ pressed }) => [
            styles.plusBtn,
            pressed && styles.plusBtnPressed,
          ]}
          accessibilityLabel={`增加 ${item.name} 数量`}
        >
          <Text style={styles.plusText}>＋</Text>
        </Pressable>
      </View>
      {item.tag ? <Text style={styles.tag}>{item.tag}</Text> : null}
      <View style={styles.bottomRow}>
        <Pressable
          onPressIn={() => startContinuous(onDecrease)}
          onPressOut={stopContinuous}
          android_ripple={{ color: '#eee' }}
          style={({ pressed }) => [styles.qtyPressable, pressed && styles.qtyPressed]}
          accessibilityLabel={`减少 ${item.name} 数量`}
        >
          <Text style={styles.qtyText}>数量：{item.qty}</Text>
        </Pressable>
        {typeof item.daysAgo === "number" ? (
          <Text style={styles.date}>{item.daysAgo === 0 ? "今天" : `${item.daysAgo}天前`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    // width is controlled by parent via `cardWidth` to support responsive grids
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    paddingRight: 18,
  },
  tag: {
    fontSize: 10,
    backgroundColor: "#eef1f6",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    color: "#333",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btn: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  qtyText: {
    fontSize: 12,
    color: "#333",
  },
  date: {
    textAlign: "right",
    color: "#888",
    fontSize: 10,
  },
  plusBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 18,
    color: '#2A52BE',
    fontWeight: '600',
  },
  plusBtnPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: '#EAF2FF',
    shadowColor: '#2A52BE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  qtyPressable: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyPressed: {
    backgroundColor: '#f2f6fb',
  },
});
