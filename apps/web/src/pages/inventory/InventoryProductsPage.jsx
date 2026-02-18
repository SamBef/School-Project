import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import CustomSelect from '../../components/CustomSelect';

function loadProducts(setData, setError, setLoading) {
  setLoading(true);
  setError(null);
  api.inventory.getProducts({ limit: 200 })
    .then((res) => setData({ products: res.products || [], total: res.total || 0 }))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}

export default function InventoryProductsPage() {
  const { business } = useAuth();
  const [data, setData] = useState({ products: [], total: 0 });
  const [units, setUnits] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formPrimaryUnitId, setFormPrimaryUnitId] = useState('');
  const [formMinStock, setFormMinStock] = useState('');
  const [formInitialQuantity, setFormInitialQuantity] = useState('');
  const [formInitialLocationId, setFormInitialLocationId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editPrimaryUnitId, setEditPrimaryUnitId] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [stockByProductId, setStockByProductId] = useState({});

  useEffect(() => {
    loadProducts(setData, setError, setLoading);
  }, []);

  useEffect(() => {
    if (data.products.length === 0) {
      setStockByProductId({});
      return;
    }
    api.inventory.getStockLevels()
      .then((res) => {
        const levels = res.stockLevels || [];
        const byProduct = {};
        levels.forEach((l) => {
          const id = l.productId || l.product?.id;
          if (!id) return;
          const qty = l.quantity != null ? Number(l.quantity) : 0;
          byProduct[id] = (byProduct[id] || 0) + qty;
        });
        setStockByProductId(byProduct);
      })
      .catch(() => setStockByProductId({}));
  }, [data.products.length]);

  function isPrimaryUnit(unit) {
    return (
      (unit.symbol && unit.symbol.toLowerCase() === 'pc') ||
      (unit.name && unit.name.toLowerCase() === 'pieces')
    );
  }

  const sortedUnits = [...units].sort((a, b) => {
    const aPrimary = isPrimaryUnit(a);
    const bPrimary = isPrimaryUnit(b);
    if (aPrimary && !bPrimary) return -1;
    if (!aPrimary && bPrimary) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const primaryUnits = sortedUnits.filter(isPrimaryUnit);
  const otherUnits = sortedUnits.filter((u) => !isPrimaryUnit(u));

  useEffect(() => {
    api.inventory.getUnits()
      .then((list) => {
        const u = Array.isArray(list) ? list : [];
        setUnits(u);
        const piecesUnit = u.find(
          (unit) =>
            (unit.symbol && unit.symbol.toLowerCase() === 'pc') ||
            (unit.name && unit.name.toLowerCase() === 'pieces')
        );
        if (piecesUnit) setFormPrimaryUnitId(piecesUnit.id);
      })
      .catch(() => setUnits([]));
  }, []);

  useEffect(() => {
    api.inventory.getLocations()
      .then((list) => setLocations(Array.isArray(list) ? list : []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    if (locations.length === 0) return;
    setFormInitialLocationId((prev) => {
      if (prev !== '') return prev;
      const defaultId = business?.defaultLocationId;
      if (defaultId && locations.some((l) => l.id === defaultId)) return defaultId;
      return locations[0].id;
    });
  }, [locations, business?.defaultLocationId]);

  async function handleAddProduct(e) {
    e.preventDefault();
    setSubmitError('');
    const name = formName.trim();
    if (!name) {
      setSubmitError('Name is required.');
      return;
    }
    if (!formPrimaryUnitId) {
      setSubmitError('Primary unit is required.');
      return;
    }
    const initialQty = formInitialQuantity === '' ? 0 : Number(formInitialQuantity);
    if (initialQty < 1) {
      setSubmitError('Initial quantity is required (enter at least 1).');
      return;
    }
    if (!formInitialLocationId) {
      setSubmitError('Location for initial stock is required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.inventory.createProduct({
        name,
        sku: formSku.trim() || undefined,
        primaryUnitId: formPrimaryUnitId,
        minStock: formMinStock === '' ? undefined : Number(formMinStock),
      });
      await api.inventory.setInitialStock(created.id, {
        locationId: formInitialLocationId,
        quantity: initialQty,
      });
      setFormName('');
      setFormSku('');
      setFormPrimaryUnitId(formPrimaryUnitId);
      setFormMinStock('');
      setFormInitialQuantity('');
      loadProducts(setData, setError, setLoading);
    } catch (err) {
      setSubmitError(err.message || t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(p) {
    setEditingProduct(p);
    setEditName(p.name || '');
    setEditSku(p.sku || '');
    setEditPrimaryUnitId(p.primaryUnitId || p.primaryUnit?.id || '');
    setEditMinStock(p.minStock != null ? String(p.minStock) : '');
    setEditError('');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError('');
    const name = editName.trim();
    if (!name) {
      setEditError('Name is required.');
      return;
    }
    if (!editPrimaryUnitId) {
      setEditError('Primary unit is required.');
      return;
    }
    setEditSubmitting(true);
    try {
      await api.inventory.updateProduct(editingProduct.id, {
        name,
        sku: editSku.trim() || undefined,
        primaryUnitId: editPrimaryUnitId,
        minStock: editMinStock === '' ? undefined : Number(editMinStock),
      });
      setEditingProduct(null);
      loadProducts(setData, setError, setLoading);
    } catch (err) {
      setEditError(err.message || t('common.saveFailed'));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(product) {
    setDeletingId(product.id);
    try {
      await api.inventory.deleteProduct(product.id);
      setProductToDelete(null);
      loadProducts(setData, setError, setLoading);
    } catch (err) {
      setSubmitError(err.message || t('common.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-content">
      <nav className="page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/inventory">{t('common.back')}</Link>
        <span aria-hidden="true"> · </span>
        <span>{t('inventory.products')}</span>
      </nav>
      <h1 className="page-title">{t('inventory.products')}</h1>

      <div className="card animate-card-in" aria-labelledby="add-product-heading">
        <div className="card-header">
          <h2 id="add-product-heading">{t('inventory.addProduct')}</h2>
        </div>
        <form onSubmit={handleAddProduct} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-name">{t('common.name')}</label>
              <input
                id="product-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                autoComplete="off"
                placeholder="e.g. Rice 1kg"
              />
            </div>
            <div className="form-group">
              <label htmlFor="product-sku">{t('inventory.sku')}</label>
              <input
                id="product-sku"
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                autoComplete="off"
                placeholder="e.g. RICE-1KG"
                aria-describedby="product-sku-hint"
              />
              <p id="product-sku-hint" className="form-hint">{t('inventory.skuDescription')}</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-unit">{t('inventory.primaryUnit')}</label>
              <CustomSelect
                id="product-unit"
                className="input-select-unit"
                value={formPrimaryUnitId}
                onChange={setFormPrimaryUnitId}
                placeholder={t('inventory.selectUnit')}
                required
                aria-describedby={units.length > 0 ? 'product-unit-hint' : undefined}
                optionGroups={[
                  ...(primaryUnits.length > 0 ? [{
                    label: t('inventory.unitGroupPrimary'),
                    options: primaryUnits.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.symbol ? ` (${u.symbol})` : ''}`,
                    })),
                  }] : []),
                  ...(otherUnits.length > 0 ? [{
                    label: t('inventory.unitGroupOther'),
                    options: otherUnits.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.symbol ? ` (${u.symbol})` : ''}`,
                    })),
                  }] : []),
                ]}
              />
              {units.length === 0 && <p className="form-hint">Add units first under Inventory → Units.</p>}
              {units.length > 0 && (
                <p id="product-unit-hint" className="form-hint">
                  {t('inventory.primaryUnitHint')}
                </p>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="product-minstock">{t('inventory.minStockLabel')}</label>
              <input
                id="product-minstock"
                type="number"
                min="0"
                step="1"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="product-initial-qty">{t('inventory.initialQuantity')}</label>
              <input
                id="product-initial-qty"
                type="number"
                min="1"
                step="1"
                value={formInitialQuantity}
                onChange={(e) => setFormInitialQuantity(e.target.value)}
                placeholder="e.g. 10"
                autoComplete="off"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="product-initial-location">{t('inventory.locationForInitialStock')}</label>
              <CustomSelect
                id="product-initial-location"
                value={formInitialLocationId}
                onChange={setFormInitialLocationId}
                placeholder={t('inventory.selectLocation')}
                required
                options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              />
            </div>
          </div>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting || units.length === 0 || locations.length === 0}>
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      {editingProduct && (
        <div className="card animate-card-in" aria-labelledby="edit-product-heading">
          <div className="card-header">
            <h2 id="edit-product-heading">{t('inventory.editProduct')}</h2>
          </div>
          <form onSubmit={handleEditSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-product-name">{t('common.name')}</label>
                <input
                  id="edit-product-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-product-sku">{t('inventory.sku')}</label>
                <input
                  id="edit-product-sku"
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-product-unit">{t('inventory.primaryUnit')}</label>
                <CustomSelect
                  id="edit-product-unit"
                  value={editPrimaryUnitId}
                  onChange={setEditPrimaryUnitId}
                  placeholder={t('inventory.selectUnit')}
                  required
                  options={[
                    ...primaryUnits.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.symbol ? ` (${u.symbol})` : ''}`,
                    })),
                    ...otherUnits.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.symbol ? ` (${u.symbol})` : ''}`,
                    })),
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-product-minstock">{t('inventory.minStockLabel')}</label>
                <input
                  id="edit-product-minstock"
                  type="number"
                  min="0"
                  step="1"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            {editError && <p className="form-error" role="alert">{editError}</p>}
            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                {editSubmitting ? t('common.loading') : t('common.save')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingProduct(null); setEditError(''); }}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="loading-page"><Spinner size={32} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && data.products.length === 0 && <p className="inventory-no-alerts">{t('common.noDataYet')}</p>}
      {!loading && !error && data.products.length > 0 && (
        <div className="card animate-card-in-delay">
          <div className="card-header">
            <h2>{t('inventory.products')}</h2>
            <span className="card-header-count">{data.total} {t('common.total')}</span>
          </div>
          <div className="table-scroll">
          <table className="data-table" role="grid">
            <thead>
              <tr>
                <th scope="col">{t('common.name')}</th>
                <th scope="col">{t('inventory.sku')}</th>
                <th scope="col">{t('inventory.units')}</th>
                <th scope="col">{t('inventory.quantityStocked')}</th>
                <th scope="col">{t('inventory.threshold')}</th>
                <th scope="col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku || '—'}</td>
                  <td>{p.primaryUnit ? p.primaryUnit.name : '—'}</td>
                  <td>{stockByProductId[p.id] != null ? stockByProductId[p.id] : '0'}</td>
                  <td>{p.minStock != null ? p.minStock : '—'}</td>
                  <td>
                    {productToDelete?.id === p.id ? (
                      <div className="confirm-delete" role="alertdialog" aria-label={t('inventory.confirmDeleteProduct')}>
                        <p>{t('inventory.confirmDeleteProduct')}</p>
                        <div className="confirm-delete-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? t('common.loading') : t('common.confirm')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setProductToDelete(null)}
                            disabled={deletingId === p.id}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="table-cell-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(p)}
                          aria-label={t('common.edit')}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setProductToDelete(p)}
                          aria-label={t('common.delete')}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
