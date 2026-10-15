import { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import CampaignsPage from './CampaignsPage';
import CampaignPage from './CampaignPage';
import ComposerPage from './ComposerPage';
import { campaignStore } from './campaignStore';
export default function App() {
  useEffect(() => {
    const timer = window.setInterval(() => campaignStore.advance(), 1000);
    return () => window.clearInterval(timer);
  }, [campaignStore]);
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
      </div>
    </BrowserRouter>
  );
}
