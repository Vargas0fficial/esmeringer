import { ToastProvider } from './context/ToastContext';
import RandomChatPage from './pages/RandomChatPage';

export default function App() {
  return (
    <ToastProvider>
      <main className="page-content">
        <RandomChatPage />
      </main>
    </ToastProvider>
  );
}
