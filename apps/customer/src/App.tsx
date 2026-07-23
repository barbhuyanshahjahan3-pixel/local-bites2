import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { Screen } from './navigation';
import BottomNav from './components/BottomNav';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import RestaurantPage from './pages/RestaurantPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmedPage from './pages/OrderConfirmedPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import ComplaintsPage from './pages/ComplaintsPage';

const NAV_SCREENS: Screen['name'][] = ['home', 'search', 'cart', 'orders', 'profile'];

export default function App() {
  const { token } = useAuth();
  const { lines } = useCart();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  if (!token) return <RegisterPage />;

  const cartCount = lines.reduce((s, l) => s + l.quantity, 0);

  const renderScreen = () => {
    switch (screen.name) {
      case 'home':
        return <HomePage onNavigate={setScreen} />;
      case 'search':
        return <SearchPage onNavigate={setScreen} />;
      case 'restaurant':
        return <RestaurantPage restaurantId={screen.id} onNavigate={setScreen} />;
      case 'cart':
        return <CartPage onNavigate={setScreen} />;
      case 'checkout':
        return <CheckoutPage onNavigate={setScreen} />;
      case 'orderConfirmed':
        return <OrderConfirmedPage orderId={screen.orderId} onNavigate={setScreen} />;
      case 'orders':
        return <OrdersPage onNavigate={setScreen} />;
      case 'orderDetail':
        return <OrderDetailPage orderId={screen.id} onNavigate={setScreen} />;
      case 'wishlist':
        return <WishlistPage onNavigate={setScreen} />;
      case 'profile':
        return <ProfilePage onNavigate={setScreen} />;
      case 'complaints':
        return <ComplaintsPage />;
      default:
        return <HomePage onNavigate={setScreen} />;
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen.name}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      {NAV_SCREENS.includes(screen.name) && (
        <BottomNav active={screen.name} onNavigate={setScreen} cartCount={cartCount} />
      )}
    </div>
  );
}
