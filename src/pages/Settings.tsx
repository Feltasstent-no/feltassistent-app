import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Shield } from 'lucide-react';

export function Settings() {
  return (
    <Layout>
      <div className="max-w-2xl pb-20 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Innstillinger</h1>
          <p className="text-slate-600 mt-1">Administrer appen</p>
        </div>

        <div className="space-y-4">
          <Link
            to="/admin"
            className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 flex items-center space-x-4 transition"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Admin</h3>
              <p className="text-sm text-slate-600">Administrer klasser, disipliner og presets</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
