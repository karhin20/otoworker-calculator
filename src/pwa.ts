import { registerSW } from 'virtual:pwa-register';

window.addEventListener('load', () => {
  const pwaRegister = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log('SW registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    }
  });

  pwaRegister();
}); 