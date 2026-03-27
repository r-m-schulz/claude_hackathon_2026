import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Clock3,
  Stethoscope,
  MoreHorizontal,
  ChevronRight,
  ClipboardList,
} from "lucide-react-native";
import type { PatientHomeSummary } from "@triageai/shared";
import { MOCK_PATIENT_HOME } from "../../fixtures/mock";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalize(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function AppointmentCard({
  appt,
  department,
}: {
  appt: NonNullable<PatientHomeSummary["next_appointment"]>;
  department: string;
}) {
  const hasPendingSuggestion = appt.suggestion_status === "pending";

  return (
    <View style={styles.apptCard}>
      {/* Header row */}
      <View style={styles.apptCardHeader}>
        <View style={styles.apptAvatar}>
          <Stethoscope color="#5b7bf5" size={20} />
        </View>
        <View style={styles.apptInfo}>
          <Text style={styles.apptDeptName}>{capitalize(department)}</Text>
          <Text style={styles.apptSubtitle}>Scheduled appointment</Text>
        </View>
        <MoreHorizontal color="rgba(255,255,255,0.45)" size={20} />
      </View>

      {/* Status badges */}
      {appt.is_on_the_day && (
        <View style={[styles.apptBadge, styles.apptBadgeCritical]}>
          <Text style={styles.apptBadgeText}>On-the-day — clinician review pending</Text>
        </View>
      )}
      {hasPendingSuggestion && !appt.is_on_the_day && (
        <View style={[styles.apptBadge, styles.apptBadgeInfo]}>
          <Text style={styles.apptBadgeText}>Change suggested — awaiting approval</Text>
        </View>
      )}

      {/* Date / time row */}
      <View style={styles.apptCardFooter}>
        <View style={styles.apptFooterItem}>
          <CalendarDays color="rgba(255,255,255,0.75)" size={13} />
          <Text style={styles.apptFooterText}>{formatDate(appt.scheduled_at)}</Text>
        </View>
        <View style={styles.apptFooterDivider} />
        <View style={styles.apptFooterItem}>
          <Clock3 color="rgba(255,255,255,0.75)" size={13} />
          <Text style={styles.apptFooterText}>{formatTime(appt.scheduled_at)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  // Step 2: replace MOCK_PATIENT_HOME with live data from the backend.
  const patient = MOCK_PATIENT_HOME;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Hello, {patient.full_name.split(" ")[0]}</Text>
      <Text style={styles.department}>{capitalize(patient.department)}</Text>

      <Text style={styles.sectionTitle}>Upcoming appointment</Text>

      {patient.next_appointment ? (
        <AppointmentCard
          appt={patient.next_appointment}
          department={patient.department}
        />
      ) : (
        <View style={styles.apptCard}>
          <Text style={styles.apptDeptName}>No upcoming appointments</Text>
        </View>
      )}

      {patient.pending_survey_count > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.surveyBanner,
            pressed && styles.surveyBannerPressed,
          ]}
          onPress={() => router.push("/(app)/surveys")}
        >
          <View style={styles.surveyBannerIconWrap}>
            <ClipboardList color="#2563eb" size={18} />
          </View>
          <View style={styles.surveyBannerBody}>
            <View style={styles.surveyBannerTitleRow}>
              <Text style={styles.surveyBannerTitle}>
                {patient.pending_survey_count === 1
                  ? "1 survey waiting"
                  : `${patient.pending_survey_count} surveys waiting`}
              </Text>
            </View>
            <Text style={styles.surveyBannerSub}>
              Helps your clinician assess your care
            </Text>
          </View>
          <ChevronRight color="#9ba8bb" size={18} />
        </Pressable>
      )}
    </ScrollView>
  );
}

const CARD_BLUE = "#5b7bf5";

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f7fb" },
  container: { padding: 24, paddingTop: 64, paddingBottom: 40 },

  greeting: { fontSize: 26, fontWeight: "700", color: "#172033" },
  department: {
    fontSize: 14,
    color: "#3f4b60",
    marginTop: 4,
    marginBottom: 28,
    textTransform: "capitalize",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 14,
  },

  /* Appointment card */
  apptCard: {
    backgroundColor: CARD_BLUE,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: CARD_BLUE,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  apptCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  apptAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  apptInfo: { flex: 1 },
  apptDeptName: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  apptSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  apptBadge: {
    marginHorizontal: 18,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  apptBadgeCritical: { backgroundColor: "rgba(239,68,68,0.25)" },
  apptBadgeInfo: { backgroundColor: "rgba(255,255,255,0.18)" },
  apptBadgeText: { fontSize: 12, color: "#ffffff", fontWeight: "500" },
  apptCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  apptFooterItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  apptFooterText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  apptFooterDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  /* Survey banner */
  surveyBanner: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  surveyBannerPressed: { opacity: 0.8 },
  surveyBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  surveyBannerBody: { flex: 1 },
  surveyBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  surveyBannerTitle: { fontSize: 15, fontWeight: "700", color: "#172033" },
  surveyBannerSub: { fontSize: 12, color: "#9ba8bb", lineHeight: 17 },
});
