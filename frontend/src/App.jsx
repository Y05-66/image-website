/**
 * 应用路由表：定义登录/注册/找回密码及受保护的主站路由。
 */
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Gallery from './pages/Gallery.jsx'
import ImageDetail from './pages/ImageDetail.jsx'
import Upload from './pages/Upload.jsx'
import Ranking from './pages/Ranking.jsx'
import Feed from './pages/Feed.jsx'
import Profile from './pages/Profile.jsx'
import AdminReview from './pages/AdminReview.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Gallery />} />
        <Route path="upload" element={<Upload />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="feed" element={<Feed />} />
        <Route path="profile" element={<Profile />} />
        <Route path="image/:id" element={<ImageDetail />} />
        <Route
          path="review"
          element={
            <RequireAdmin>
              <AdminReview />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}