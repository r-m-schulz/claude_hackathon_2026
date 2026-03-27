import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MOCK_PENDING_SURVEYS } from "../../../fixtures/mock";

export default function SurveyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Step 3: this screen becomes the full dynamic survey renderer.
  // For now it previews the survey questions from mock data.
  const survey = MOCK_PENDING_SURVEYS.find((s) => s.survey_id === id);

  if (!survey) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Survey not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.dept}>{survey.department}</Text>
      <Text style={styles.heading}>
        {survey.questions.length} questions
      </Text>
      <Text style={styles.placeholder}>
        Full renderer with scale, yes/no, multiple-choice, and free-text inputs
        coming in Step 3.
      </Text>

      {survey.questions.map((q, i) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionIndex}>Q{i + 1}</Text>
          <Text style={styles.questionText}>{q.text}</Text>
          <Text style={styles.questionType}>{q.type}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f7fb" },
  container: { padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#ef4444" },
  dept: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ba8bb",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#172033", marginBottom: 8 },
  placeholder: {
    fontSize: 13,
    color: "#9ba8bb",
    marginBottom: 28,
    lineHeight: 20,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  questionIndex: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 4,
  },
  questionText: { fontSize: 15, color: "#172033", lineHeight: 22 },
  questionType: {
    marginTop: 8,
    fontSize: 12,
    color: "#9ba8bb",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
