import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setRuntimeLanguage } from '../i18n/runtime';

const LANGUAGE_STORAGE_KEY = 'onlist.language';
const SUPPORTED_LANGUAGES = ['fr', 'en'];

const translations = {
  fr: {
    common: {
      cancel: 'Annuler',
      error: 'Erreur',
      success: 'Succès',
      french: 'Français',
      english: 'Anglais',
    },
    tabs: {
      home: 'Accueil',
      explore: 'Explorer',
      events: 'Événements',
      places: 'Lieux',
      profile: 'Profil',
    },
    welcome: {
      slides: [
        { tag: 'Deviens Influenceur !', title: "Participe aux meilleurs évènements d'influence !" },
        { tag: 'Développe ton Business', title: 'Connecte-toi aux meilleurs influenceurs et modèles' },
        { tag: "Vis l'expérience", title: 'Touche une audience\nlocale plus large' },
      ],
      registerBusiness: "S'inscrire en tant qu'Établissement",
      registerMember: "S'inscrire en tant que Membre",
      alreadyAccount: 'Déjà un compte ?',
      login: 'Se connecter',
    },
    settings: {
      title: 'Paramètres',
      languageSection: 'LANGUE',
      languageHint: "La langue de toute l'application est mise à jour immédiatement.",
      accountSection: 'MON COMPTE',
      changePassword: 'Modifier le mot de passe',
      terms: "Conditions d'utilisation",
      privacy: 'Politique de confidentialité',
      deleteAccount: 'Supprimer mon compte',
      requiredTitle: 'Champs requis',
      requiredMessage: 'Veuillez remplir tous les champs.',
      shortPasswordTitle: 'Mot de passe trop court',
      shortPasswordMessage: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      passwordMismatch: 'Les mots de passe ne correspondent pas.',
      passwordChanged: 'Votre mot de passe a été modifié avec succès.',
      passwordChangeFailed: 'Impossible de modifier le mot de passe.',
      deleteTitle: 'Supprimer le compte',
      deleteWarning: 'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      delete: 'Supprimer',
      finalConfirmation: 'Confirmation finale',
      deleteConfirmation: 'Êtes-vous certain de vouloir supprimer le compte de {{name}} ? Cette action ne peut pas être annulée.',
      thisUser: 'cet utilisateur',
      confirmDelete: 'Oui, supprimer',
      deleteFailed: 'Impossible de supprimer le compte.',
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le nouveau mot de passe',
      strengthShort: 'Trop court',
      strengthFair: 'Correct',
      strengthStrong: 'Fort',
    },
  },
  en: {
    common: {
      cancel: 'Cancel',
      error: 'Error',
      success: 'Success',
      french: 'French',
      english: 'English',
    },
    tabs: {
      home: 'Home',
      explore: 'Explore',
      events: 'Events',
      places: 'Places',
      profile: 'Profile',
    },
    welcome: {
      slides: [
        { tag: 'Become an Influencer!', title: 'Join the best influencer events!' },
        { tag: 'Grow your Business', title: 'Connect with the best influencers and models' },
        { tag: 'Live the experience', title: 'Reach a wider\nlocal audience' },
      ],
      registerBusiness: 'Sign up as a Business',
      registerMember: 'Sign up as a Member',
      alreadyAccount: 'Already have an account?',
      login: 'Log in',
    },
    settings: {
      title: 'Settings',
      languageSection: 'LANGUAGE',
      languageHint: 'The language of the entire app is updated immediately.',
      accountSection: 'MY ACCOUNT',
      changePassword: 'Change password',
      terms: 'Terms of Use',
      privacy: 'Privacy Policy',
      deleteAccount: 'Delete my account',
      requiredTitle: 'Required fields',
      requiredMessage: 'Please complete all fields.',
      shortPasswordTitle: 'Password too short',
      shortPasswordMessage: 'The new password must contain at least 8 characters.',
      passwordMismatch: 'The passwords do not match.',
      passwordChanged: 'Your password was changed successfully.',
      passwordChangeFailed: 'Unable to change the password.',
      deleteTitle: 'Delete account',
      deleteWarning: 'This action cannot be undone. All your data will be permanently deleted.',
      delete: 'Delete',
      finalConfirmation: 'Final confirmation',
      deleteConfirmation: 'Are you sure you want to delete the account for {{name}}? This action cannot be undone.',
      thisUser: 'this user',
      confirmDelete: 'Yes, delete',
      deleteFailed: 'Unable to delete the account.',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      strengthShort: 'Too short',
      strengthFair: 'Fair',
      strengthStrong: 'Strong',
    },
  },
};

const LanguageContext = createContext(null);

function resolveTranslation(language, key) {
  return key.split('.').reduce((value, part) => value?.[part], translations[language]);
}

function interpolate(value, variables) {
  if (typeof value !== 'string' || !variables) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('fr');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((savedLanguage) => {
        if (SUPPORTED_LANGUAGES.includes(savedLanguage)) {
          setRuntimeLanguage(savedLanguage);
          setLanguageState(savedLanguage);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const setLanguage = (nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) return;
    setRuntimeLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => null);
  };

  const value = useMemo(() => ({
    language,
    loading,
    setLanguage,
    t: (key, variables) => {
      const translated = resolveTranslation(language, key);
      const fallback = resolveTranslation('fr', key);
      return interpolate(translated ?? fallback ?? key, variables);
    },
  }), [language, loading]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
