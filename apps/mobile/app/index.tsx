import { Text, View } from "react-native";
import { DEPARTMENTS } from "@triageai/shared";

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#f5f7fb",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#172033", marginBottom: 12 }}>
        TriageAI mobile scaffold
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: "#3f4b60", marginBottom: 24 }}>
        Patient auth, survey rendering, appointment visibility, and notification
        handling will be built here.
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#172033", marginBottom: 8 }}>
        Supported departments: {DEPARTMENTS.length}
      </Text>
      {DEPARTMENTS.map((department) => (
        <Text key={department} style={{ fontSize: 14, lineHeight: 22, color: "#3f4b60" }}>
          {department}
        </Text>
      ))}
    </View>
  );
}
