import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import { ToastProvider } from './lib/toast';
import PageTransition from './components/Motion/PageTransition';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Partners from './pages/Partners';
import Flash from './pages/Flash';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Hotspots from './pages/dashboard/Hotspots';
import Plans from './pages/dashboard/Plans';
import Vouchers from './pages/dashboard/Vouchers';
import Transactions from './pages/dashboard/Transactions';
import Resellers from './pages/dashboard/Resellers';
import Roaming from './pages/dashboard/Roaming';
import DashboardPartners from './pages/dashboard/Partners';
import DashboardUsers from './pages/dashboard/Users';
import Settings from './pages/dashboard/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const location = useLocation();

  return (
    <ThemeProvider>
      <I18nProvider>
      <AuthProvider>
        <ToastProvider>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname.split('/')[1] || '/'}>
            <Route element={<Layout />}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/partners" element={<PageTransition><Partners /></PageTransition>} />
              <Route path="/flash" element={<PageTransition><Flash /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
              <Route path="/cookies" element={<PageTransition><Cookies /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            </Route>
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/dashboard/hotspots" element={<PageTransition><Hotspots /></PageTransition>} />
              <Route path="/dashboard/plans" element={<PageTransition><Plans /></PageTransition>} />
              <Route path="/dashboard/vouchers" element={<PageTransition><Vouchers /></PageTransition>} />
              <Route path="/dashboard/transactions" element={<PageTransition><Transactions /></PageTransition>} />
              <Route path="/dashboard/resellers" element={<PageTransition><Resellers /></PageTransition>} />
              <Route path="/dashboard/roaming" element={<PageTransition><Roaming /></PageTransition>} />
              <Route path="/dashboard/users" element={<PageTransition><DashboardUsers /></PageTransition>} />
              <Route path="/dashboard/partners" element={<PageTransition><DashboardPartners /></PageTransition>} />
              <Route path="/dashboard/settings" element={<PageTransition><Settings /></PageTransition>} />
            </Route>
          </Routes>
        </AnimatePresence>
        </ToastProvider>
      </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
