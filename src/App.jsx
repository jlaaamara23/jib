import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import StorePage from './pages/StorePage'
import ProductPage from './pages/ProductPage'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Cart from './pages/Cart'
import MyOrders from './pages/MyOrders'
import AddProduct from './pages/AddProduct'
import CreateStore from './pages/CreateStore'

function Protected({ children, requireAuth = true, requireManager = false }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading">Loading…</div>
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireManager) {
    const role = user?.role ?? ''
    if (role !== 'ADMIN' && role !== 'OWNER') {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="store/:slug" element={<StorePage />} />
        <Route path="product/:productId" element={<ProductPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="cart" element={<Protected><Cart /></Protected>} />
        <Route path="orders" element={<Protected><MyOrders /></Protected>} />
        <Route path="add-product" element={<Protected requireManager><AddProduct /></Protected>} />
        <Route path="create-store" element={<Protected requireManager><CreateStore /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
