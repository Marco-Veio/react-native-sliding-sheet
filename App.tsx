import { useState, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SlidingSheet, SlidingSheetRef } from "./SlidingSheet";

export default function App() {
  const ref = useRef<SlidingSheetRef>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [open, setOpen] = useState(false);

  const array = [...Array(100).keys()];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <TouchableOpacity onPress={() => setOpen(true)}>
        <Text>Open</Text>
      </TouchableOpacity>
      <SlidingSheet visible={open} onClose={() => setOpen(false)} ref={ref}>
        <View style={{ height: "100%", width: "80%" }}>
          <ScrollView
            ref={scrollRef}
            style={{ backgroundColor: "red" }}
            contentContainerStyle={{ alignItems: "center" }}
            bounces={false}
          >
            {array.map((item) => (
              <Text key={item}>{item}</Text>
            ))}
          </ScrollView>
        </View>
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
