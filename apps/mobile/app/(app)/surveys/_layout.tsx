import { Stack } from "expo-router";

export default function SurveysLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#172033",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
      }}
    />
  );
}
