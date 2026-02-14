import { Redirect, router } from "expo-router";
import { Button, Card, Spinner, useToast } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";

export default function AuthScreen() {
  const { data: session, isPending } = authClient.useSession();
  const { toast } = useToast();

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
    <Container isScrollable={false} className="justify-center p-6">
      <Card variant="secondary" className="p-6">
        <View className="items-center gap-3">
          <Text className="text-2xl font-semibold text-foreground">Shelf Life</Text>
          <Text className="text-muted text-center">Continue with Google to access your home screen.</Text>
          <Button
            className="w-full mt-2"
            onPress={async () => {
              await authClient.signIn.social(
                {
                  provider: "google",
                  callbackURL: "/home",
                },
                {
                  onError: (error) => {
                    toast.show({
                      variant: "danger",
                      label: error.error?.message || "Google sign in failed",
                    });
                  },
                  onSuccess: () => {
                    router.replace("/home");
                  },
                },
              );
            }}
          >
            <Button.Label>Continue with Google</Button.Label>
          </Button>
        </View>
      </Card>
    </Container>
  );
}
