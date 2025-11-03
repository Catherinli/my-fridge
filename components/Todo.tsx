import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Todo {
  id: string;
  text: string;
}

export default function Todo() {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<Todo[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const saved = await AsyncStorage.getItem('tasks');
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载任务失败:', e);
    }
  };

  const saveTasks = async (newTasks: Todo[]) => {
    try {
      setTasks(newTasks);
      await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
    } catch (e) {
      console.error('保存任务失败:', e);
    }
  };

  const addTask = () => {
    if (!task.trim()) return;
    const newTasks = [...tasks, { id: Date.now().toString(), text: task }];
    saveTasks(newTasks);
    setTask('');
  };

  const deleteTask = (id: string) => {
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <View style={styles.todoCard}>
      <Text style={styles.todoText} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
    </View>
  );

  return (
    <View>
      <Text style={styles.title}>我的冰箱</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="输入任务..."
          value={task}
          onChangeText={setTask}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity onPress={addTask} style={styles.addButton}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    marginLeft: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 20 },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  todoText: { fontSize: 14, color: '#222' },
  // delete style kept for future use but not rendered
  delete: { fontSize: 16, display: 'none' },
});
