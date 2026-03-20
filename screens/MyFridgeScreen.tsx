import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist/lib/module";
import { SwipeRow } from 'react-native-swipe-list-view';
import ItemCard from "../components/ItemCard";
import { addItem, addSection, deleteItem, getAllItems, getAllSections, updateItem, updateSectionSortOrders } from "../src/database/crud";
import { initDB } from "../src/database/initDB";

type Item = {
  id: number | string;
  name: string;
  tag?: string;
  qty?: number;
  daysAgo?: number;
  unit?: string | null;
  sectionId?: number | null;
};

type SectionRow = {
  id: number;
  type: string;
  name?: string | null;
  temperature?: number | null;
  icon?: string | null;
  sortOrder?: number | null;
};

export default function MyFridgeScreen() {
  // Auto-close delay (ms) and enable LayoutAnimation for smooth transitions
  const AUTO_CLOSE_MS = 900; // 可根据需求调整（例如 1000-3500ms）
  const FAB_MENU_WIDTH = 170;
  const FAB_MENU_MARGIN = 8;

  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSectionId, setNewItemSectionId] = useState<number | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionType, setNewSectionType] = useState<'freezer' | 'fridge'>('fridge');

  useEffect(() => {
    // Enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    // console.log(item);
  }, []);
  // SwipeRow typing can be strict in some versions; use a typed-any alias for JSX usage
  const SwipeRowAny: any = SwipeRow;
  // section data will be derived from state arrays so we can mutate qty
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [itemsBySection, setItemsBySection] = useState<Record<number, Item[]>>({});
  const [loading, setLoading] = useState(true);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [fabAnchor, setFabAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const fabRef = useRef<any>(null);
  const fabMenuAnim = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<any>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(Dimensions.get("window").width);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<SectionRow[]>([]);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeRows, setOrganizeRows] = useState<
    Array<
      | { key: string; kind: "section"; sectionId: number; title: string; icon: string }
      | { key: string; kind: "item"; itemId: number; sectionId: number; name: string; qty: number; unit: string | null }
    >
  >([]);

  const openAddForSection = (sectionId: number) => {
    setNewItemName("");
    setNewItemSectionId(sectionId);
    setAddOpen(true);
  };

  const openAddItemDefault = () => {
    const sectionId = sections[0]?.id ?? null;
    if (!sectionId) {
      openAddSection();
      return;
    }
    openAddForSection(sectionId);
  };

  const closeAdd = () => setAddOpen(false);

  const openAddSection = () => {
    setNewSectionName("");
    setNewSectionType("fridge");
    setAddSectionOpen(true);
  };

  const closeAddSection = () => setAddSectionOpen(false);

  const closeFabMenu = () => {
    Animated.timing(fabMenuAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setFabMenuOpen(false);
    });
  };

  const openFabMenu = () => {
    fabRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) => {
      const localX = x - containerOffset.x;
      const localY = y - containerOffset.y;
      setFabAnchor({ x: localX, y: localY, w, h });
      setFabMenuOpen(true);
      fabMenuAnim.setValue(0);
      Animated.spring(fabMenuAnim, {
        toValue: 1,
        friction: 10,
        tension: 120,
        useNativeDriver: true,
      }).start();
    });
  };

  const openReorder = () => {
    setReorderDraft(sections);
    setReorderOpen(true);
  };

  const closeReorder = () => setReorderOpen(false);

  const saveReorder = async () => {
    const updates = reorderDraft.map((s, index) => ({ id: s.id, sort_order: index + 1 }));
    await updateSectionSortOrders(updates);
    await loadDataFromDb();
    setReorderOpen(false);
  };

  const submitAdd = async () => {
    const name = newItemName.trim();
    if (!name) return;
    const sectionId = newItemSectionId ?? sections[0]?.id ?? null;
    if (!sectionId) return;
    await addItem({
      name,
      quantity: 1,
      unit: "pcs",
      section_id: sectionId,
    });
    await loadDataFromDb();
    setAddOpen(false);
  };

  const submitAddNewSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;
    const icon = newSectionType === "freezer" ? "❄️" : "🧊";
    const temperature = newSectionType === "freezer" ? -18 : 4;
    await addSection({
      type: newSectionType,
      name,
      icon,
      temperature,
    });
    await loadDataFromDb();
    setAddSectionOpen(false);
  };

  const sectionColor = (type: string) => {
    if (type === "freezer") return "#E8F3FF";
    if (type === "fridge") return "#E9FCFC";
    return "#F2F4F8";
  };

  const loadDataFromDb = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionRows, itemRows] = await Promise.all([getAllSections(), getAllItems()]);
      const normalizedSections: SectionRow[] = (sectionRows || []).map((s: any) => ({
        id: Number(s.id),
        type: s.type,
        name: s.name ?? null,
        temperature: s.temperature ?? null,
        icon: s.icon ?? null,
        sortOrder: typeof s.sort_order === "number" ? s.sort_order : s.sort_order != null ? Number(s.sort_order) : null,
      }));

      const fallbackSectionId = normalizedSections[0]?.id ?? null;
      const bySection: Record<number, Item[]> = {};
      normalizedSections.forEach((s) => {
        bySection[s.id] = [];
      });

      (itemRows || []).forEach((r: any) => {
        const sectionId: number | null =
          typeof r.section_id === "number"
            ? r.section_id
            : r.section_id != null
              ? Number(r.section_id)
              : fallbackSectionId;
        if (!sectionId) return;
        const uiItem: Item = {
          id: r.id,
          name: r.name,
          tag: r.unit || undefined,
          qty: typeof r.quantity === 'number' ? r.quantity : Number(r.quantity ?? 0),
          daysAgo: 0,
          unit: r.unit ?? null,
          sectionId,
        };
        if (!bySection[sectionId]) bySection[sectionId] = [];
        bySection[sectionId].push(uiItem);
      });

      setSections(normalizedSections);
      setItemsBySection(bySection);
    } catch (err) {
      console.warn('MyFridgeScreen: failed to load items from DB', err);
      setSections([]);
      setItemsBySection({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initDB();
      if (!mounted) return;
      await loadDataFromDb();
    })();
    return () => {
      mounted = false;
    };
  }, [loadDataFromDb]);

  const sectionData = sections.map((s) => ({
    key: String(s.id),
    sectionId: s.id,
    type: s.type,
    title: s.name || "未命名分区",
    icon: s.icon || "🧊",
    color: sectionColor(s.type),
    data: itemsBySection[s.id] ?? [],
  }));

  const openOrganize = () => {
    const rows: Array<
      | { key: string; kind: "section"; sectionId: number; title: string; icon: string }
      | { key: string; kind: "item"; itemId: number; sectionId: number; name: string; qty: number; unit: string | null }
    > = [];
    for (const s of sections) {
      rows.push({
        key: `s-${s.id}`,
        kind: "section",
        sectionId: s.id,
        title: s.name || "未命名分区",
        icon: s.icon || "🧊",
      });
      const list = itemsBySection[s.id] ?? [];
      for (const it of list) {
        rows.push({
          key: `i-${String(it.id)}`,
          kind: "item",
          itemId: Number(it.id),
          sectionId: s.id,
          name: it.name,
          qty: Number(it.qty ?? 0),
          unit: it.unit ?? null,
        });
      }
    }
    setOrganizeRows(rows);
    setOrganizeOpen(true);
  };

  const closeOrganize = () => setOrganizeOpen(false);

  const saveOrganize = async () => {
    let currentSectionId: number | null = null;
    const desiredByItemId = new Map<number, number>();
    for (const r of organizeRows) {
      if (r.kind === "section") {
        currentSectionId = r.sectionId;
        continue;
      }
      if (currentSectionId != null) {
        desiredByItemId.set(r.itemId, currentSectionId);
      }
    }

    const currentByItemId = new Map<number, number>();
    for (const sectionIdStr of Object.keys(itemsBySection)) {
      const sectionId = Number(sectionIdStr);
      for (const it of itemsBySection[sectionId] ?? []) {
        currentByItemId.set(Number(it.id), sectionId);
      }
    }

    const updates: Array<{ id: number; sectionId: number }> = [];
    for (const [itemId, nextSectionId] of desiredByItemId) {
      const prevSectionId = currentByItemId.get(itemId);
      if (prevSectionId == null) continue;
      if (prevSectionId !== nextSectionId) {
        updates.push({ id: itemId, sectionId: nextSectionId });
      }
    }

    if (updates.length) {
      await Promise.all(updates.map((u) => updateItem(u.id, { section_id: u.sectionId })));
    }
    await loadDataFromDb();
    setOrganizeOpen(false);
  };

  const increaseItem = (sectionId: number, id: number | string) => {
    setItemsBySection((prev) => {
      const list = prev[sectionId] ?? [];
      const next = list.map((it) => {
        if (it.id !== id) return it;
        const quantity = (it.qty || 0) + 1;
        void updateItem(Number(it.id), { quantity });
        return { ...it, qty: quantity };
      });
      return { ...prev, [sectionId]: next };
    });
  };



  // decrease functions: decrement qty; if it reaches 0, remove the item and schedule undo
  const decreaseItem = (sectionId: number, id: number | string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItemsBySection((prev) => {
      const list = prev[sectionId] ?? [];
      let removed: Item | null = null;
      let updated: { id: number; quantity: number } | null = null;
      const next: Item[] = [];
      for (const it of list) {
        if (it.id !== id) {
          next.push(it);
          continue;
        }
        const newQty = (it.qty ?? 0) - 1;
        if (newQty <= 0) {
          removed = it;
          continue;
        }
        updated = { id: Number(it.id), quantity: newQty };
        next.push({ ...it, qty: newQty });
      }
      if (removed) {
        void deleteItem(Number(removed.id));
        scheduleClear({ item: removed });
      } else if (updated) {
        void updateItem(updated.id, { quantity: updated.quantity });
      }
      return { ...prev, [sectionId]: next };
    });
  };

  // deletion + undo state
  const [lastRemoved, setLastRemoved] = React.useState<
    | { item: Item; timer: any }
    | null
  >(null);

  const scheduleClear = (obj: { item: Item }) => {
    const timer = setTimeout(() => setLastRemoved(null), 5000);
    setLastRemoved({ ...obj, timer });
  };

  const handleDelete = (sectionId: number, id: number | string) => {
    const removed = (itemsBySection[sectionId] ?? []).find((it) => it.id === id);
    if (!removed) return;
    setItemsBySection((prev) => {
      const list = prev[sectionId] ?? [];
      return { ...prev, [sectionId]: list.filter((it) => it.id !== id) };
    });
    void deleteItem(Number(removed.id));
    scheduleClear({ item: removed });
  };

  const undoDelete = () => {
    if (!lastRemoved) return;
    const { item, timer } = lastRemoved;
    clearTimeout(timer);
    const sectionId = item.sectionId ?? sections[0]?.id ?? null;
    if (!sectionId) {
      setLastRemoved(null);
      return;
    }
    void addItem({
      id: Number(item.id),
      name: item.name,
      quantity: item.qty ?? 1,
      unit: item.unit ?? item.tag ?? 'pcs',
      section_id: sectionId,
    }).then(loadDataFromDb);
    setLastRemoved(null);
  };
  // refs and timers for auto-closing swipe rows
  const rowRefs = React.useRef<Record<string, any>>({});
  const rowTimers = React.useRef<Record<string, any>>({});
  return (
    <View
      ref={containerRef}
      style={{ flex: 1 }}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
        containerRef.current?.measureInWindow?.((x: number, y: number) => {
          setContainerOffset((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
        });
      }}
    >
      <SectionList
        sections={sectionData}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: section.color }]}>
            <Pressable onLongPress={openReorder} delayLongPress={220}>
              <Text style={styles.sectionTitle}>
                {section.icon} {section.title}
              </Text>
            </Pressable>
            <View style={styles.grid}>
              {(() => {
                if (loading) return <Text style={styles.emptyText}>加载中…</Text>;
                return (
                  <>
                    {section.data.map((it) => {
                      const idKey = `${section.sectionId}-${String(it.id)}`;
                      return (
                        <View key={idKey} style={styles.itemWrapper}>
                          <SwipeRowAny
                            ref={(r: any) => (rowRefs.current[idKey] = r)}
                            rightOpenValue={-80}
                            disableRightSwipe={false}
                            onRowOpen={() => {
                              if (rowTimers.current[idKey]) clearTimeout(rowTimers.current[idKey]);
                              rowTimers.current[idKey] = setTimeout(() => {
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
                            <View style={styles.rowBack}>
                              <TouchableOpacity
                                style={styles.deleteCircle}
                                onPress={() => {
                                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                  rowRefs.current[idKey]?.closeRow?.();
                                  if (rowTimers.current[idKey]) {
                                    clearTimeout(rowTimers.current[idKey]);
                                    rowTimers.current[idKey] = undefined;
                                  }
                                  handleDelete(section.sectionId, it.id);
                                }}
                              >
                                <Text style={styles.deleteX}>×</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.itemFront}>
                              <ItemCard
                                item={it}
                                cardWidth={120}
                                onIncrease={() => increaseItem(section.sectionId, it.id)}
                                onDecrease={() => decreaseItem(section.sectionId, it.id)}
                                onDelete={() => handleDelete(section.sectionId, it.id)}
                              />
                            </View>
                          </SwipeRowAny>
                        </View>
                      );
                    })}
                  </>
                );
              })()}
            </View>
          </View>
        )}
        renderItem={() => null}
        contentContainerStyle={styles.listContent}
      />

      <Pressable
        ref={fabRef}
        style={styles.fab}
        onPress={openAddItemDefault}
        onLongPress={openFabMenu}
        accessibilityLabel="添加"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Pressable style={styles.organizeFab} onPress={openOrganize} accessibilityLabel="整理物品">
        <Text style={styles.organizeFabText}>整理</Text>
      </Pressable>

      {fabMenuOpen ? (
        <View style={styles.fabMenuLayer} pointerEvents="box-none">
          <Pressable style={styles.fabMenuBackdrop} onPress={closeFabMenu} />
          {fabAnchor ? (
            <Animated.View
              style={[
                styles.fabMenu,
                {
                  top: fabAnchor.y + fabAnchor.h + 8,
                  left: Math.max(
                    FAB_MENU_MARGIN,
                    Math.min(
                      fabAnchor.x + fabAnchor.w - FAB_MENU_WIDTH,
                      containerWidth - FAB_MENU_WIDTH - FAB_MENU_MARGIN
                    )
                  ),
                  opacity: fabMenuAnim,
                  transform: [
                    { translateY: fabMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                    { scale: fabMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                },
              ]}
            >
              <Pressable
                style={styles.fabMenuItem}
                onPress={() => {
                  closeFabMenu();
                  openAddItemDefault();
                }}
              >
                <Text style={styles.fabMenuItemText}>添加物品</Text>
              </Pressable>
              <View style={styles.fabMenuDivider} />
              <Pressable
                style={styles.fabMenuItem}
                onPress={() => {
                  closeFabMenu();
                  openAddSection();
                }}
              >
                <Text style={styles.fabMenuItemText}>添加分区</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      <Modal transparent animationType="slide" visible={reorderOpen} onRequestClose={closeReorder}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeReorder} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>调整分区顺序</Text>
              <TouchableOpacity onPress={closeReorder} accessibilityLabel="关闭">
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.reorderList}>
              <DraggableFlatList
                data={reorderDraft}
                keyExtractor={(item) => String(item.id)}
                onDragEnd={({ data }) => setReorderDraft(data)}
                renderItem={({ item, drag, isActive }) => {
                  const title = item.name || "未命名分区";
                  const icon = item.icon || "🧊";
                  return (
                    <Pressable onLongPress={drag} disabled={isActive}>
                      <View style={styles.reorderRow}>
                        <View style={styles.reorderRowLeft}>
                          <Text style={styles.reorderRowTitle}>
                            {icon} {title}
                          </Text>
                        </View>
                        <View style={styles.reorderRowRight}>
                          <Text style={styles.reorderBtnText}>≡</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeReorder}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={saveReorder}>
                <Text style={styles.primaryBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={organizeOpen} onRequestClose={closeOrganize}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeOrganize} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>整理物品</Text>
              <TouchableOpacity onPress={closeOrganize} accessibilityLabel="关闭">
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.organizeList}>
              <DraggableFlatList
                data={organizeRows}
                keyExtractor={(item) => item.key}
                onDragEnd={({ data }) => setOrganizeRows(data)}
                renderItem={({ item, drag, isActive }) => {
                  if (item.kind === "section") {
                    return (
                      <View style={styles.organizeSectionRow}>
                        <Text style={styles.organizeSectionText}>
                          {item.icon} {item.title}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <Pressable onLongPress={drag} disabled={isActive}>
                      <View style={styles.organizeItemRow}>
                        <Text style={styles.organizeItemText} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.organizeItemMeta}>{item.qty}</Text>
                        <Text style={styles.organizeItemHandle}>≡</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeOrganize}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={saveOrganize}>
                <Text style={styles.primaryBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={addOpen} onRequestClose={closeAdd}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeAdd} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加物品</Text>
              <TouchableOpacity onPress={closeAdd} accessibilityLabel="关闭">
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>物品名称</Text>
            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="例如：牛奶"
              placeholderTextColor="#999"
              style={styles.textInput}
              returnKeyType="done"
              onSubmitEditing={submitAdd}
            />

            <Text style={styles.fieldLabel}>分区</Text>
            <View style={styles.sectionChooser}>
              {sections.map((s) => (
                <TouchableOpacity
                  key={String(s.id)}
                  style={[styles.sectionPill, newItemSectionId === s.id && styles.sectionPillActive]}
                  onPress={() => setNewItemSectionId(s.id)}
                >
                  <Text style={[styles.sectionPillText, newItemSectionId === s.id && styles.sectionPillTextActive]}>
                    {(s.icon || "🧊") + " " + (s.name || "未命名分区")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeAdd}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!newItemName.trim() || sections.length === 0) && styles.primaryBtnDisabled,
                ]}
                onPress={submitAdd}
                disabled={!newItemName.trim() || sections.length === 0}
              >
                <Text style={styles.primaryBtnText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={addSectionOpen} onRequestClose={closeAddSection}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeAddSection} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加分区</Text>
              <TouchableOpacity onPress={closeAddSection} accessibilityLabel="关闭">
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>分区名称</Text>
            <TextInput
              value={newSectionName}
              onChangeText={setNewSectionName}
              placeholder="例如：蔬果区"
              placeholderTextColor="#999"
              style={styles.textInput}
              returnKeyType="done"
              onSubmitEditing={submitAddNewSection}
            />

            <Text style={styles.fieldLabel}>分区类型</Text>
            <View style={styles.sectionChooser}>
              <TouchableOpacity
                style={[styles.sectionPill, newSectionType === "freezer" && styles.sectionPillActive]}
                onPress={() => setNewSectionType("freezer")}
              >
                <Text style={[styles.sectionPillText, newSectionType === "freezer" && styles.sectionPillTextActive]}>
                  ❄️ 冷冻
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sectionPill, newSectionType === "fridge" && styles.sectionPillActive]}
                onPress={() => setNewSectionType("fridge")}
              >
                <Text style={[styles.sectionPillText, newSectionType === "fridge" && styles.sectionPillTextActive]}>
                  🧊 冷藏
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeAddSection}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !newSectionName.trim() && styles.primaryBtnDisabled]}
                onPress={submitAddNewSection}
                disabled={!newSectionName.trim()}
              >
                <Text style={styles.primaryBtnText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 120,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionHeaderHover: {
    borderWidth: 2,
    borderColor: "#2A52BE",
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
  emptyText: {
    color: "#666",
    paddingVertical: 14,
  },
  fab: {
    position: "absolute",
    top: 10,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  organizeFab: {
    position: "absolute",
    right: 14,
    bottom: 84,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  organizeFabText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2A52BE",
  },
  fabText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2A52BE",
    marginTop: -1,
  },
  fabMenuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  fabMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  fabMenu: {
    position: "absolute",
    width: 170,
    minWidth: 150,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
    overflow: "hidden",
  },
  fabMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fabMenuItemText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C2A4A",
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  itemWrapper: {
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 6,
  },
  itemWrapperDragging: {
    opacity: 0.2,
  },
  itemFront: {
    position: "relative",
  },
  dragHandle: {
    position: "absolute",
    right: -10,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dragHandleText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1C2A4A",
    marginTop: -1,
  },
  dragLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  dragGhost: {
    position: "absolute",
    opacity: 0.95,
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

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  modalClose: {
    fontSize: 26,
    lineHeight: 26,
    color: "#666",
    paddingHorizontal: 6,
  },
  reorderList: {
    maxHeight: 320,
    marginBottom: 14,
  },
  reorderListContent: {
    paddingBottom: 6,
  },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F6F7FB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  reorderRowLeft: {
    flex: 1,
    paddingRight: 10,
  },
  reorderRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  reorderRowRight: {
    flexDirection: "row",
    gap: 8,
  },
  reorderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  reorderBtnDisabled: {
    opacity: 0.35,
  },
  reorderBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1C2A4A",
    marginTop: -1,
  },
  reorderBtnTextDisabled: {
    color: "#1C2A4A",
  },
  organizeList: {
    maxHeight: 380,
    marginBottom: 14,
  },
  organizeSectionRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#EEF3FF",
    borderRadius: 10,
    marginBottom: 10,
  },
  organizeSectionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A52BE",
  },
  organizeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F6F7FB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
  },
  organizeItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  organizeItemMeta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1C2A4A",
    width: 32,
    textAlign: "right",
  },
  organizeItemHandle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1C2A4A",
    width: 20,
    textAlign: "right",
  },
  fieldLabel: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E3E6EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    marginBottom: 14,
    backgroundColor: "#FAFBFE",
  },
  sectionChooser: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  sectionPill: {
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E3E6EE",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#FAFBFE",
  },
  sectionPillActive: {
    borderColor: "#2A52BE",
    backgroundColor: "#EAF2FF",
  },
  sectionPillText: {
    color: "#444",
    fontWeight: "600",
  },
  sectionPillTextActive: {
    color: "#2A52BE",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E3E6EE",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelBtnText: {
    color: "#444",
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#2A52BE",
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});
