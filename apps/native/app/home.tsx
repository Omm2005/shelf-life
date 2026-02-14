import { Redirect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Button, Card, Spinner } from "heroui-native";
import { Platform, Text, View } from "react-native";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";

export default function HomeScreen() {
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await authClient.signOut();
  }

  if (isPending) {
    return (
      <Container isScrollable={false} className="justify-center items-center">
        <Spinner />
      </Container>
    );
  }

  if (!session?.user) {
    return <Redirect href="/" />;
  }

  return (
    <Container className="p-6" isScrollable={false}>
      <View className="flex-1 justify-center">
        <Card variant="secondary" className="p-6 gap-2">
          <Text className="text-2xl font-semibold text-foreground">Home</Text>
          <Text className="text-muted">Signed in as {session.user.email}</Text>
          <Button
            className="mt-2"
            variant="secondary"
            onPress={handleSignOut}
          >
            <Button.Label>Sign out</Button.Label>
          </Button>
        </Card>
      </View>
    </Container>
  );
}
