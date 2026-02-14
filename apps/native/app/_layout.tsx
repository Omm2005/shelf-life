import "@/polyfills";
import "@/global.css";
import { SplashScreen, Stack } from "expo-router";
import { HeroUINativeProvider, Spinner } from "heroui-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";

SplashScreen.preventAutoHideAsync();

function StackLayout() {
  const { data: session, isPending } = authClient.useSession();
  const hasHiddenSplash = useRef(false);

  useEffect(() => {
    if (!isPending && !hasHiddenSplash.current) {
      hasHiddenSplash.current = true;
      // Prevent runtime errors if the native splash is already gone.
      Promise.resolve(SplashScreen.hide()).catch(() => null);
    }
  }, [isPending]);

  if (isPending) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Spinner />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session?.user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session?.user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <HeroUINativeProvider>
            <StackLayout />
          </HeroUINativeProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
