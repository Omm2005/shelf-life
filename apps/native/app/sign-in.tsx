import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Button, Card, useToast } from "heroui-native";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

export default function SignInScreen() {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleSignIn() {
    if (isSigningIn) {
      return;
    }
    setIsSigningIn(true);

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await authClient.signIn.social(
        {
          provider: "google",
          callbackURL: "/",
        },
        {
          onError: async (error) => {

            toast.show({
              variant: "danger",
              label: error.error?.message || "Google sign in failed",
            });
          },
          onSuccess: async () => {
            router.replace("/");
          },
        },
      );
    } catch {
      toast.show({
        variant: "danger",
        label: "Google sign in failed",
      });
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <Container isScrollable={false} className="p-6 justify-center">
      <Card variant="secondary" className="rounded-2xl p-5 min-h-[560px] bg-card">
        <View className="flex-row justify-between items-center">
          <Text className="text-muted">Welcome</Text>
          <ThemeToggle />
        </View>

        <View className="flex-1 justify-end pb-3">
          <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
            <Text className="text-5xl leading-[52px] font-semibold text-foreground">every</Text>
            <Text className="text-5xl leading-[52px] font-semibold text-brand">expiry</Text>
            <Text className="text-5xl leading-[52px] font-semibold text-foreground">counts</Text>
            <Text className="text-muted mt-1">
              Track pantry dates and prevent food waste with Shelf Life.
            </Text>
          </Animated.View>

          <Button className="w-full rounded-xl h-11" onPress={handleGoogleSignIn} isDisabled={isSigningIn}>
            <Button.Label>{isSigningIn ? "Opening Google..." : "Continue with Google"}</Button.Label>
          </Button>
        </View>
      </Card>
    </Container>
  );
}
