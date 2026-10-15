import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import useFetch from "./useFetch";

type Post = {
  id: number | string;
  title: string;
  body: string;
};

export default function FetchAndShowList() {
  const posts = useFetch("https://jsonplaceholder.typicode.com/posts") as Post[];

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { padding: 12, marginBottom: 8, backgroundColor: "#1e293b", borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  body: { fontSize: 14, color: "#94a3b8" },
});
