import { registerSW } from 'virtual:pwa-register';

window.addEventListener('load', () => {
  const pwaRegister = registerSW({
    immediate: true,
    onRegistered(registration) {
      console.log('SW registered: ', registration);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    }
  });

  pwaRegister();
}); 