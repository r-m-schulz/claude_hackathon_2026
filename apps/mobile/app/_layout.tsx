import { Stack } from "expo-router";

// Step 1: root stack hosts (auth) and (app) route groups.
// Step 2 will add auth state and redirect logic here.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
