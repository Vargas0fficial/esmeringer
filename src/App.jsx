import SplashScreen from './components/SplashScreen';
import { ToastProvider } from './context/ToastContext';
import { useSplash } from './hooks/useSplash';
import RandomChatPage from './pages/RandomChatPage';

export default function App() {
  const splash = useSplash();

  return (
    <ToastProvider>
      {splash !== 'done' && <SplashScreen leaving={splash === 'leaving'} />}
      <main className="page-content">
        <RandomChatPage />
      </main>
    </ToastProvider>
  );
}