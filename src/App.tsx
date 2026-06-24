import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import CouponForm from './pages/CouponForm'
import Coupons from './pages/Coupons'
import FabricForm from './pages/FabricForm'
import Fabrics from './pages/Fabrics'
import MeasurementAttributeForm from './pages/MeasurementAttributeForm'
import MeasurementAttributes from './pages/MeasurementAttributes'
import ProductCategories from './pages/ProductCategories'
import ProductCategoryForm from './pages/ProductCategoryForm'
import ProductCategorySubcategories from './pages/ProductCategorySubcategories'
import ProductForm from './pages/ProductForm'
import Products from './pages/Products'
import SizeForm from './pages/SizeForm'
import Sizes from './pages/Sizes'
import UserGroups from './pages/UserGroups'
import Users from './pages/Users'
import Orders from './pages/Orders'
import Returns from './pages/Returns'
import ReturnDetail from './pages/ReturnDetail'
import Inventory from './pages/Inventory'
import Banners from './pages/Banners'
import FlashSales from './pages/FlashSales'
import Broadcasts from './pages/Broadcasts'
import Analytics from './pages/Analytics'
import Bundles from './pages/Bundles'
import Loyalty from './pages/Loyalty'
import Reviews from './pages/Reviews'
import GiftCards from './pages/GiftCards'
import NotFound from './pages/NotFound'
import ProtectedRoute from './routes/ProtectedRoute'

const App = (): ReactElement => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/products" element={<Products />} />
        <Route path="/dashboard/products/new" element={<ProductForm />} />
        <Route path="/dashboard/products/:id/edit" element={<ProductForm />} />
        <Route path="/dashboard/product-categories" element={<ProductCategories />} />
        <Route path="/dashboard/product-categories/new" element={<ProductCategoryForm />} />
        <Route
          path="/dashboard/product-categories/:categoryId/subcategories"
          element={<ProductCategorySubcategories />}
        />
        <Route path="/dashboard/product-categories/:id/edit" element={<ProductCategoryForm />} />
        <Route path="/dashboard/fabrics" element={<Fabrics />} />
        <Route path="/dashboard/fabrics/new" element={<FabricForm />} />
        <Route path="/dashboard/fabrics/:id/edit" element={<FabricForm />} />
        <Route path="/dashboard/coupons" element={<Coupons />} />
        <Route path="/dashboard/coupons/new" element={<CouponForm />} />
        <Route path="/dashboard/coupons/:id/edit" element={<CouponForm />} />
        <Route path="/dashboard/measurement-attributes" element={<MeasurementAttributes />} />
        <Route path="/dashboard/measurement-attributes/new" element={<MeasurementAttributeForm />} />
        <Route
          path="/dashboard/measurement-attributes/:id/edit"
          element={<MeasurementAttributeForm />}
        />
        <Route path="/dashboard/sizes" element={<Sizes />} />
        <Route path="/dashboard/sizes/new" element={<SizeForm />} />
        <Route path="/dashboard/sizes/:id/edit" element={<SizeForm />} />
        <Route path="/dashboard/users" element={<Users />} />
        <Route path="/dashboard/user-groups" element={<UserGroups />} />
        <Route path="/dashboard/orders" element={<Orders />} />
        <Route path="/dashboard/returns" element={<Returns />} />
        <Route path="/dashboard/returns/:id" element={<ReturnDetail />} />
        <Route path="/dashboard/inventory" element={<Inventory />} />
        <Route path="/dashboard/banners" element={<Banners />} />
        <Route path="/dashboard/flash-sales" element={<FlashSales />} />
        <Route path="/dashboard/broadcasts" element={<Broadcasts />} />
        <Route path="/dashboard/analytics" element={<Analytics />} />
        <Route path="/dashboard/bundles" element={<Bundles />} />
        <Route path="/dashboard/loyalty" element={<Loyalty />} />
        <Route path="/dashboard/reviews" element={<Reviews />} />
        <Route path="/dashboard/gift-cards" element={<GiftCards />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default App
