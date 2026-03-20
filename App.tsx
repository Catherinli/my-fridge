import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MyFridgeSection from "./screens/MyFridgeScreen";
import Todo from "./components/Todo";
import { initDB } from "./src/database/initDB";

export default function App() {
  // DB initialization
  useEffect(() => {
    initDB();
  }, []);
  // Tab state
  const [activeTab, setActiveTab] = useState<"fridge" | "todo">("fridge");

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        {activeTab === "fridge" ? <MyFridgeSection /> : <Todo />}
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "fridge" && styles.activeTab]}
          onPress={() => setActiveTab("fridge")}
        >
          <Text style={[styles.tabText, activeTab === "fridge" && styles.activeText]}>
            我的冰箱
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "todo" && styles.activeTab]}
          onPress={() => setActiveTab("todo")}
        >
          <Text style={[styles.tabText, activeTab === "todo" && styles.activeText]}>
            待办事项
          </Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBFF",
    marginTop: 50,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: "#E6E8ED",
    borderRadius: 20,
    marginHorizontal: 60,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
  },
  activeText: {
    color: "#2A52BE",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
