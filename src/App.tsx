import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import CampaignsPage from './Email/CampaignsPage';
import CampaignPage from './Email/CampaignPage';
import ComposerPage from './Email/ComposerPage';
export default function App() {
  return (
    <BrowserRouter>
      <div className="admin_content_wrap admin_content_wrap_distribution">
        <header className="admin-header">
          <h1>Рассылка</h1>
        </header>
        <div className="admin_filters">
          <div className="admin_filters_links">
            <Link
              className="admin_filters_link admin_filters_link_active"
              to="/admin/distribution"
            >
              На почту
            </Link>
            <button className="admin_filters_link" disabled>
              Мобила
            </button>
          </div>
        </div>
        <Routes>
          <Route path="/admin/distribution" element={<CampaignsPage />} />
          <Route path="/admin/distribution/new" element={<ComposerPage />} />
          <Route
            path="/admin/distribution/campaign/:id"
            element={<CampaignPage />}
          />
          <Route
            path="*"
            element={<Navigate to="/admin/distribution" replace />}
          />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
