import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import LaunchAnimation from './src/components/LaunchAnimation';
import RootNavigator from './src/navigation';
import { COLORS } from './src/constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [launchDone, setLaunchDone] = useState(false);

  // L'app se monte derrière l'écran de lancement dès que les polices sont
  // prêtes : l'animation masque le chargement au lieu de s'y ajouter.
  // L'ancien ActivityIndicator devient inutile — l'animation le remplace.
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {fontsLoaded ? (
          <LanguageProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </AuthProvider>
          </LanguageProvider>
        ) : null}

        {!launchDone ? (
          <LaunchAnimation canDismiss={fontsLoaded} onFinish={() => setLaunchDone(true)} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
