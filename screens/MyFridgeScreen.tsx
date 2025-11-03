import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { SwipeRow } from 'react-native-swipe-list-view';
import ItemCard from "../components/ItemCard";

type Item = {
  id: number | string;
  name: string;
  tag?: string;
  qty?: number;
  daysAgo?: number;
};

export default function MyFridgeScreen() {
  // Auto-close delay (ms) and enable LayoutAnimation for smooth transitions
  const AUTO_CLOSE_MS = 900; // 可根据需求调整（例如 1000-3500ms）

  useEffect(() => {
    // Enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  // SwipeRow typing can be strict in some versions; use a typed-any alias for JSX usage
  const SwipeRowAny: any = SwipeRow;
  // section data will be derived from state arrays so we can mutate qty
  const [frozenItems, setFrozenItems] = useState<Item[]>([
    { id: 1, name: "冰淇淋", tag: "甜品", qty: 2, daysAgo: 1 },
    { id: 2, name: "速冻饺子", tag: "速冻食品", qty: 1, daysAgo: 3 },
    { id: 3, name: "速冻饺子", tag: "速冻食品", qty: 1, daysAgo: 3 },
  ]);
  const [fridgeItems, setFridgeItems] = useState<Item[]>([
    { id: 3, name: "牛奶", tag: "饮品", qty: 2, daysAgo: 0 },
  ]);

  // build section list from state so updates (qty changes) re-render
  const sectionData = [
    { key: "frozen", title: "冷冻区", icon: "❄️", color: "#E8F3FF", data: frozenItems },
    { key: "fridge", title: "冷藏区", icon: "🧊", color: "#E9FCFC", data: fridgeItems },
  ];

  const increaseFrozen = (id: number | string) =>
    setFrozenItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: (it.qty || 0) + 1 } : it)));

  const increaseFridge = (id: number | string) =>
    setFridgeItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: (it.qty || 0) + 1 } : it)));



  // decrease functions: decrement qty; if it reaches 0, remove the item and schedule undo
  const decreaseFrozen = (id: number | string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFrozenItems((prev) => {
      let removed: Item | null = null;
      const next = prev.reduce<Item[]>((acc, it) => {
        if (it.id === id) {
          const newQty = (it.qty ?? 0) - 1;
          if (newQty <= 0) {
            removed = it;
            return acc; // drop from result
          }
          acc.push({ ...it, qty: newQty });
        } else acc.push(it);
        return acc;
      }, []);
      if (removed) scheduleClear({ item: removed, list: 'frozen' });
      return next;
    });
  };

  const decreaseFridge = (id: number | string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFridgeItems((prev) => {
      let removed: Item | null = null;
      const next = prev.reduce<Item[]>((acc, it) => {
        if (it.id === id) {
          const newQty = (it.qty ?? 0) - 1;
          if (newQty <= 0) {
            removed = it;
            return acc;
          }
          acc.push({ ...it, qty: newQty });
        } else acc.push(it);
        return acc;
      }, []);
      if (removed) scheduleClear({ item: removed, list: 'fridge' });
      return next;
    });
  };

  // deletion + undo state
  const [lastRemoved, setLastRemoved] = React.useState<
    | { item: Item; list: 'frozen' | 'fridge'; timer: any }
    | null
  >(null);

  const scheduleClear = (obj: { item: Item; list: 'frozen' | 'fridge' }) => {
    const timer = setTimeout(() => setLastRemoved(null), 5000);
    setLastRemoved({ ...obj, timer });
  };

  const handleDelete = (listKey: 'frozen' | 'fridge', id: number | string) => {
    if (listKey === 'frozen') {
      const removed = frozenItems.find((it) => it.id === id);
      if (!removed) return;
      setFrozenItems((prev) => prev.filter((it) => it.id !== id));
      // allow undo
      scheduleClear({ item: removed, list: 'frozen' });
    } else {
      const removed = fridgeItems.find((it) => it.id === id);
      if (!removed) return;
      setFridgeItems((prev) => prev.filter((it) => it.id !== id));
      scheduleClear({ item: removed, list: 'fridge' });
    }
  };

  const undoDelete = () => {
    if (!lastRemoved) return;
    const { item, list, timer } = lastRemoved;
    clearTimeout(timer);
    if (list === 'frozen') setFrozenItems((prev) => [item, ...prev]);
    else setFridgeItems((prev) => [item, ...prev]);
    setLastRemoved(null);
  };
  // refs and timers for auto-closing swipe rows
  const rowRefs = React.useRef<Record<string, any>>({});
  const rowTimers = React.useRef<Record<string, any>>({});
  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sectionData}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: section.color }]}>
            <Text style={styles.sectionTitle}>
              {section.icon} {section.title}
            </Text>
            {/* items grid: 使用 flexWrap 来实现并列布局（不依赖 FlatList 的 numColumns） */}
            <View style={styles.grid}>
              {(() => {
                return section.data.map((it) => {
                  // use composite key including section to avoid id collisions across sections
                  const idKey = `${section.key}-${String(it.id)}`;
                  return (
                    <View key={idKey} style={[styles.itemWrapper]}>
                      <SwipeRowAny
                        ref={(r: any) => (rowRefs.current[idKey] = r)}
                        rightOpenValue={-80}
                        disableRightSwipe={false}
                        onRowOpen={() => {
                          // auto close after AUTO_CLOSE_MS if user doesn't act
                          if (rowTimers.current[idKey]) clearTimeout(rowTimers.current[idKey]);
                          rowTimers.current[idKey] = setTimeout(() => {
                            // animate the closing for smoothness
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            rowRefs.current[idKey]?.closeRow?.();
                            rowTimers.current[idKey] = undefined;
                          }, AUTO_CLOSE_MS);
                        }}
                        onRowClose={() => {
                          if (rowTimers.current[idKey]) {
                            clearTimeout(rowTimers.current[idKey]);
                            rowTimers.current[idKey] = undefined;
                          }
                        }}
                      >
                        {/* Hidden row (back) - small circular delete button */}
                        <View style={styles.rowBack}>
                          <TouchableOpacity
                            style={styles.deleteCircle}
                            onPress={() => {
                              // animate list change then delete
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              // close row immediately
                              rowRefs.current[idKey]?.closeRow?.();
                              if (rowTimers.current[idKey]) {
                                clearTimeout(rowTimers.current[idKey]);
                                rowTimers.current[idKey] = undefined;
                              }
                              handleDelete(section.key as 'frozen' | 'fridge', it.id);
                            }}
                          >
                            <Text style={styles.deleteX}>×</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Visible row (front) */}
                        <ItemCard
                          item={it}
                          cardWidth={130}
                          onIncrease={() => (section.key === "frozen" ? increaseFrozen(it.id) : increaseFridge(it.id))}
                          onDecrease={() => (section.key === "frozen" ? decreaseFrozen(it.id) : decreaseFridge(it.id))}
                          onDelete={() => handleDelete(section.key as 'frozen' | 'fridge', it.id)}
                        />
                      </SwipeRowAny>
                    </View>
                  );
                });
              })()}
            </View>
          </View>
        )}
        renderItem={() => null}
        contentContainerStyle={styles.listContent}
      />

      {lastRemoved ? (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>已删除 {lastRemoved.item.name}</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.snackbarUndo}>撤销</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2A52BE",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
    gap: 12, // 列间距
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    justifyContent: "center",
  },
  itemWrapper: {
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 6,
  },
  rowBack: {
    alignItems: 'flex-end',
    flex: 1,
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: '#FF4D4F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 6,
  },
  deleteActionText: { color: '#fff', fontWeight: '700' },
  // small circular delete button
  deleteCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  deleteX: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snackbarText: { color: '#fff' },
  snackbarUndo: { color: '#4da6ff', fontWeight: '700', marginLeft: 12 },
});
