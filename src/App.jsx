import { Routes, Route, Navigate } from 'react-router-dom'
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
function Protected({ children, requireAuth = true }) {
  const token = localStorage.getItem('token')
  if (requireAuth && !token) return <Navigate to="/login" replace />
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
        <Route path="add-product" element={<Protected><AddProduct /></Protected>} />
        <Route path="create-store" element={<Protected><CreateStore /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
