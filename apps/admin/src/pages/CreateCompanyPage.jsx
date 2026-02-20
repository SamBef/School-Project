import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { IconBack, IconProfile, IconSignOut } from '../components/AdminIcons';

export default function CreateCompanyPage() {
  const { name, email, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    primaryLocation: '',
    baseCurrencyCode: 'USD',
    address: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPassword: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/admin/businesses', {
        businessName: form.businessName.trim(),
        businessEmail: form.businessEmail.trim(),
        businessPhone: form.businessPhone.trim(),
        primaryLocation: form.primaryLocation.trim(),
        baseCurrencyCode: form.baseCurrencyCode.trim() || 'USD',
        address: form.address.trim() || undefined,
        ownerEmail: form.ownerEmail.trim(),
        ownerFirstName: form.ownerFirstName.trim(),
        ownerLastName: form.ownerLastName.trim(),
        ownerPassword: form.ownerPassword,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create company.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-layout">
      <header className="admin-header" role="banner">
        <div className="admin-header-left">
          <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to companies" title="Companies">
            <IconBack />
          </Link>
          <h1 className="admin-header-title">Create company</h1>
        </div>
        <div className="admin-header-actions">
          <Link to="/profile" className="btn btn-ghost btn-icon" aria-label="Profile" title="Profile">
            <IconProfile />
          </Link>
          <span className="admin-header-email">{name || email}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={logout} aria-label="Sign out" title="Sign out">
            <IconSignOut />
          </button>
        </div>
      </header>

      <main className="admin-main" role="main">
        <div className="card card-form">
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--color-neutral-600)' }}>
            Create a new company and its first user (owner). The owner can sign in to the main app and invite more users.
          </p>
          <form onSubmit={handleSubmit}>
            {error && <p className="form-error" role="alert">{error}</p>}
            <h3 className="form-section-title">Company</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Company name *</label>
                <input id="businessName" name="businessName" type="text" required value={form.businessName} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="businessEmail">Company email *</label>
                <input id="businessEmail" name="businessEmail" type="email" required value={form.businessEmail} onChange={handleChange} disabled={loading} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessPhone">Company phone *</label>
                <input id="businessPhone" name="businessPhone" type="tel" required value={form.businessPhone} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="primaryLocation">Primary location (city/town) *</label>
                <input id="primaryLocation" name="primaryLocation" type="text" required value={form.primaryLocation} onChange={handleChange} disabled={loading} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="baseCurrencyCode">Base currency</label>
                <input id="baseCurrencyCode" name="baseCurrencyCode" type="text" placeholder="USD" maxLength={3} value={form.baseCurrencyCode} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group form-group-flex">
                <label htmlFor="address">Address (optional)</label>
                <input id="address" name="address" type="text" value={form.address} onChange={handleChange} disabled={loading} />
              </div>
            </div>

            <h3 className="form-section-title">Owner (first user)</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ownerEmail">Owner email *</label>
                <input id="ownerEmail" name="ownerEmail" type="email" required value={form.ownerEmail} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="ownerFirstName">First name *</label>
                <input id="ownerFirstName" name="ownerFirstName" type="text" required value={form.ownerFirstName} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="ownerLastName">Last name *</label>
                <input id="ownerLastName" name="ownerLastName" type="text" required value={form.ownerLastName} onChange={handleChange} disabled={loading} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="ownerPassword">Owner password *</label>
              <input id="ownerPassword" name="ownerPassword" type="password" required minLength={8} value={form.ownerPassword} onChange={handleChange} disabled={loading} autoComplete="new-password" />
              <span className="form-hint">Minimum 8 characters.</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating…' : 'Create company'}
              </button>
              <Link to="/" className="btn btn-ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
