import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS } from '../constants/theme';
import LiquidGlassTabBar from '../components/LiquidGlassTabBar';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import MemberRegisterFlow from '../screens/auth/MemberRegisterFlow';
import BusinessHowItWorks from '../screens/auth/BusinessHowItWorks';
import BusinessRegisterFlow from '../screens/auth/BusinessRegisterFlow';
import PendingScreen from '../screens/auth/PendingScreen';

// Influencer screens
import HomeScreen from '../screens/influencer/HomeScreen';
import ExploreScreen from '../screens/influencer/ExploreScreen';
import EventDetailScreen from '../screens/influencer/EventDetailScreen';
import MyEventsScreen from '../screens/influencer/MyEventsScreen';
import ProfileScreen from '../screens/influencer/ProfileScreen';
import EditProfileScreen from '../screens/influencer/EditProfileScreen';
import SettingsScreen from '../screens/influencer/SettingsScreen';
import SearchScreen from '../screens/influencer/SearchScreen';
import NotificationsScreen from '../screens/influencer/NotificationsScreen';

// Business screens
import BusinessHomeScreen from '../screens/business/BusinessHomeScreen';
import CreateEventScreen from '../screens/business/CreateEventScreen';
import ManageEventScreen from '../screens/business/ManageEventScreen';
import InfluencerListScreen from '../screens/business/InfluencerListScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

import { useAuth } from '../context/AuthContext';

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
      <Stack.Screen name="BusinessHowItWorks" component={BusinessHowItWorks} />
      <Stack.Screen name="RegisterBusiness" component={BusinessRegisterFlow} />
    </Stack.Navigator>
  );
}

// ─── Influencer Tabs ───────────────────────────────────────────────────────────
function InfluencerTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Laisser de la place pour la tab bar flottante
        tabBarStyle: { display: 'none' },
      }}
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
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// ─── Business Stack ────────────────────────────────────────────────────────────
function BusinessStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BusinessHome" component={BusinessHomeScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="ManageEvent" component={ManageEventScreen} />
      <Stack.Screen name="InfluencerList" component={InfluencerListScreen} />
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

  if (loading) {
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
        ) : user.type === 'business' ? (
          <Stack.Screen name="Business" component={BusinessStack} />
        ) : (
          <Stack.Screen name="Influencer" component={InfluencerStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
