import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { Button, Card, Spinner, useToast } from "heroui-native";
import { Platform, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

export default function AuthScreen() {
  const { data: session, isPending } = authClient.useSession();
  const { toast } = useToast();

  async function handleGoogleSignIn() {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/home",
      },
      {
        onError: async (error) => {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }

          toast.show({
            variant: "danger",
            label: error.error?.message || "Google sign in failed",
          });
        },
        onSuccess: async () => {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.replace("/home");
        },
      },
    );
  }

  if (isPending) {
    return (
      <Container isScrollable={false} className="justify-center items-center">
        <Spinner />
      </Container>
    );
  }

  if (session?.user) {
    return <Redirect href="/home" />;
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

          <Button className="w-full rounded-xl h-11" onPress={handleGoogleSignIn}>
            <Button.Label>Continue with Google</Button.Label>
          </Button>
        </View>
      </Card>
    </Container>
  );
}
