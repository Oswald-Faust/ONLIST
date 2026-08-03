import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../constants/theme';
import LiquidGlassTabBar from '../components/LiquidGlassTabBar';
import BusinessTabBar from '../components/BusinessTabBar';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import MemberRegisterFlow from '../screens/auth/MemberRegisterFlow';
import BusinessHowItWorks from '../screens/auth/BusinessHowItWorks';
import BusinessRegisterFlow from '../screens/auth/BusinessRegisterFlow';
import PendingScreen from '../screens/auth/PendingScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetCodeScreen from '../screens/auth/ResetCodeScreen';
import NewPasswordScreen from '../screens/auth/NewPasswordScreen';

// Influencer screens
import HomeScreen from '../screens/influencer/HomeScreen';
import ExploreScreen from '../screens/influencer/ExploreScreen';
import EventDetailScreen from '../screens/influencer/EventDetailScreen';
import LieuDetailScreen from '../screens/influencer/LieuDetailScreen';
import MyEventsScreen from '../screens/influencer/MyEventsScreen';
import ProfileScreen from '../screens/influencer/ProfileScreen';
import EditProfileScreen from '../screens/influencer/EditProfileScreen';
import SettingsScreen from '../screens/influencer/SettingsScreen';
import SearchScreen from '../screens/influencer/SearchScreen';
import NotificationsScreen from '../screens/influencer/NotificationsScreen';
import AttendanceConfirmedScreen from '../screens/influencer/AttendanceConfirmedScreen';
import AccessPassScreen from '../screens/influencer/AccessPassScreen';
import DeliverablesScreen from '../screens/influencer/DeliverablesScreen';

// Business screens
import BusinessDashboardScreen from '../screens/business/BusinessDashboardScreen';
import BusinessNotificationsScreen from '../screens/business/BusinessNotificationsScreen';
import BusinessInfluencerProfileScreen from '../screens/business/BusinessInfluencerProfileScreen';
import LieuxScreen from '../screens/business/LieuxScreen';
import EvenementsScreen from '../screens/business/EvenementsScreen';
import BusinessProfileScreen from '../screens/business/BusinessProfileScreen';
import BusinessEditProfileScreen from '../screens/business/BusinessEditProfileScreen';
import BusinessSettingsScreen from '../screens/business/BusinessSettingsScreen';
import BusinessSubscriptionScreen from '../screens/business/BusinessSubscriptionScreen';
import BusinessBillingScreen from '../screens/business/BusinessBillingScreen';
import CreateLieuScreen from '../screens/business/CreateLieuScreen';
import BusinessLieuDetailScreen from '../screens/business/BusinessLieuDetailScreen';
import CreateEventScreen from '../screens/business/CreateEventScreen';
import BusinessEventDetailScreen from '../screens/business/BusinessEventDetailScreen';
import EventCheckInScannerScreen from '../screens/business/EventCheckInScannerScreen';
import BusinessApplicationAssetsScreen from '../screens/business/BusinessApplicationAssetsScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BUSINESS_SIGNUP_ENABLED, EXTERNAL_PURCHASES_ENABLED } from '../constants/platformPolicy';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.bg },
};

// ─── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterInfluencer" component={MemberRegisterFlow} />
      {BUSINESS_SIGNUP_ENABLED && (
        <>
          <Stack.Screen name="BusinessHowItWorks" component={BusinessHowItWorks} />
          <Stack.Screen name="RegisterBusiness" component={BusinessRegisterFlow} />
        </>
      )}
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetCode" component={ResetCodeScreen} />
      <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
    </Stack.Navigator>
  );
}

// ─── Influencer Tabs ───────────────────────────────────────────────────────────
function InfluencerTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="MyEvents" component={MyEventsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Influencer Stack ──────────────────────────────────────────────────────────
function InfluencerStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="InfluencerTabs" component={InfluencerTabs} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="LieuDetail" component={LieuDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AttendanceConfirmed" component={AttendanceConfirmedScreen} />
      <Stack.Screen name="AccessPass" component={AccessPassScreen} />
      <Stack.Screen name="Deliverables" component={DeliverablesScreen} />
    </Stack.Navigator>
  );
}

// ─── Business Tabs ─────────────────────────────────────────────────────────────
function BusinessTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BusinessTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tab.Screen name="Dashboard" component={BusinessDashboardScreen} />
      <Tab.Screen name="Lieux" component={LieuxScreen} />
      <Tab.Screen name="Events" component={EvenementsScreen} />
      <Tab.Screen name="BizProfile" component={BusinessProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Business Stack ────────────────────────────────────────────────────────────
function BusinessStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BusinessTabs" component={BusinessTabs} />
      <Stack.Screen name="BusinessNotifications" component={BusinessNotificationsScreen} />
      <Stack.Screen name="BusinessEditProfile" component={BusinessEditProfileScreen} />
      <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} />
      <Stack.Screen name="BusinessSubscription" component={BusinessSubscriptionScreen} />
      {/* Facturation Stripe : hors iOS, où l'historique d'achat appartient à Apple. */}
      {EXTERNAL_PURCHASES_ENABLED && (
        <Stack.Screen name="BusinessBilling" component={BusinessBillingScreen} />
      )}
      <Stack.Screen name="CreateLieu" component={CreateLieuScreen} />
      <Stack.Screen name="BusinessLieuDetail" component={BusinessLieuDetailScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="BusinessEventDetail" component={BusinessEventDetailScreen} />
      <Stack.Screen name="BusinessInfluencerProfile" component={BusinessInfluencerProfileScreen} />
      <Stack.Screen name="EventCheckInScanner" component={EventCheckInScannerScreen} />
      <Stack.Screen name="BusinessApplicationAssets" component={BusinessApplicationAssetsScreen} />
    </Stack.Navigator>
  );
}

// Compte établissement sans accès actif : le paywall est présenté sur toutes
// les plateformes. Seul le moyen de paiement diffère — achat in-app sur iOS,
// Stripe Checkout ailleurs (voir constants/platformPolicy.js).
function BusinessSubscriptionGate() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="BusinessSubscriptionRequired"
        component={BusinessSubscriptionScreen}
        initialParams={{ mandatory: true }}
      />
    </Stack.Navigator>
  );
}

// ─── Admin Stack ───────────────────────────────────────────────────────────────
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { loading: languageLoading } = useLanguage();
  // Mode payant piloté depuis le dashboard admin (subscriptionBillingEnabled).
  // OFF (défaut au lancement) = tout gratuit, aucun blocage abonnement.
  const businessNeedsSubscription =
    user?.billingEnabled === true &&
    user?.type === 'business' &&
    user?.status !== 'pending' &&
    !['active', 'trialing', 'grace'].includes(user?.subscriptionStatus);

  if (loading || languageLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : user.status === 'pending' ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : user.type === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminStack} />
        ) : businessNeedsSubscription ? (
          <Stack.Screen name="BusinessSubscriptionGate" component={BusinessSubscriptionGate} />
        ) : user.type === 'business' ? (
          <Stack.Screen name="Business" component={BusinessStack} />
        ) : (
          <Stack.Screen name="Influencer" component={InfluencerStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
