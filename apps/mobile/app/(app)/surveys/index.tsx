import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { PendingSurveySummary } from "@triageai/shared";
import { MOCK_PENDING_SURVEYS } from "../../../fixtures/mock";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function SurveyRow({ item }: { item: PendingSurveySummary }) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(app)/surveys/${item.survey_id}`)}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowDept}>{item.department}</Text>
        <Text style={styles.rowMeta}>
          {item.questions.length} questions · sent {timeAgo(item.sent_at)}
        </Text>
      </View>
      <ChevronRight color="#9ba8bb" size={20} />
    </Pressable>
  );
}

export default function SurveysScreen() {
  // Step 2/4: replace MOCK_PENDING_SURVEYS with live fetch from backend.
  const surveys = MOCK_PENDING_SURVEYS;

  return (
    <View style={styles.container}>
      {surveys.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending surveys</Text>
          <Text style={styles.emptySubText}>
            You're all caught up. Check back after your next appointment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={surveys}
          keyExtractor={(item) => item.survey_id}
          renderItem={({ item }) => <SurveyRow item={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  list: { padding: 16 },
  row: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: { opacity: 0.75 },
  rowLeft: { flex: 1 },
  rowDept: {
    fontSize: 16,
    fontWeight: "600",
    color: "#172033",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  rowMeta: { fontSize: 13, color: "#9ba8bb" },
  separator: { height: 10 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#172033", marginBottom: 8 },
  emptySubText: { fontSize: 14, color: "#9ba8bb", textAlign: "center" },
});
