import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import DeliverySplash from './components/DeliverySplash';

export default function App() {
  const { token, mustChangePassword } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  const content = !token ? <LoginPage /> : mustChangePassword ? <ChangePasswordPage /> : <DashboardPage />;

  return (
    <>
      {!splashDone && <DeliverySplash onDone={() => setSplashDone(true)} />}
      {splashDone && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {content}
        </motion.div>
      )}
    </>
  );
}
