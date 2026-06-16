import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nouvelle version disponible. Recharger ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('[PWA] Prêt pour le mode hors-ligne');
  },
  onRegistered(registration) {
    console.log('[PWA] Service Worker enregistré:', registration);
  },
  onRegisterError(error) {
    console.error('[PWA] Erreur d\'enregistrement:', error);
  }
});
