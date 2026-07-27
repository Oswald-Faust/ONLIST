import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const LAUNCH_VIDEO = require('../../assets/videos/onlist-launch.mp4');

// L'animation dure 2,5 s. Au-delà de ce délai on considère que la lecture a
// échoué (codec, mémoire, simulateur…) et on libère l'app : un écran de
// lancement ne doit jamais bloquer l'accès à l'application.
const SAFETY_TIMEOUT_MS = 4500;
const FADE_OUT_MS = 400;

/**
 * Écran de lancement animé, affiché par-dessus l'app au démarrage.
 *
 * Le fondu de sortie n'est déclenché que lorsque les deux conditions sont
 * réunies : la vidéo est terminée ET l'app est prête (`canDismiss`). Cela évite
 * de découvrir un écran de chargement à la fin de l'animation.
 */
export default function LaunchAnimation({ onFinish, canDismiss = true }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [videoDone, setVideoDone] = useState(false);
  const finished = useRef(false);

  const player = useVideoPlayer(LAUNCH_VIDEO, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.play();
  });

  // Fin de la vidéo — ou expiration du filet de sécurité.
  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => setVideoDone(true));
    const timer = setTimeout(() => setVideoDone(true), SAFETY_TIMEOUT_MS);
    return () => {
      subscription?.remove?.();
      clearTimeout(timer);
    };
  }, [player]);

  const dismiss = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onFinish?.());
  }, [onFinish, opacity]);

  useEffect(() => {
    if (videoDone && canDismiss) dismiss();
  }, [videoDone, canDismiss, dismiss]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </Animated.View>
  );
}

const { width, height } = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    // On couvre l'écran physique entier (barre d'état comprise) pour que le
    // raccord avec le splash natif soit invisible.
    width,
    height,
    backgroundColor: '#000000',
    zIndex: 999,
    elevation: 999,
  },
});
