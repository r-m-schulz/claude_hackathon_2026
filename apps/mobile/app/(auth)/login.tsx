import { Text, View, StyleSheet } from "react-native";

// Step 2: Supabase magic-link auth will be implemented here.
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TriageAI</Text>
      <Text style={styles.subtitle}>Patient Portal</Text>
      <Text style={styles.placeholder}>
        Magic-link sign in — coming in Step 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f5f7fb",
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#3f4b60",
    marginTop: 6,
    marginBottom: 48,
  },
  placeholder: {
    fontSize: 14,
    color: "#9ba8bb",
    textAlign: "center",
  },
});
