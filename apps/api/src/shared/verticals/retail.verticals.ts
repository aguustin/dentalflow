import { VerticalRoleTemplate, VerticalTemplate } from './vertical.types';

const RETAIL_ROLES: VerticalRoleTemplate[] = [
  {
    name: 'cashier',
    permissions: [
      'customers.create',
      'customers.read',
      'customers.update',
      'catalog.read',
      'inventory.read',
      'sales.create',
      'sales.read',
      'sales.update',
    ],
  },
  {
    name: 'stock_keeper',
    permissions: ['catalog.create', 'catalog.read', 'catalog.update', 'inventory.read', 'inventory.update'],
  },
];

const BASE = {
  modules: ['customers', 'catalog', 'sales', 'inventory'],
  homeModule: 'sales',
  homeRoute: '/pos',
  customerAttributes: [],
  roles: RETAIL_ROLES,
} satisfies Partial<VerticalTemplate>;

const TERMS = {
  customer: { singular: 'Cliente', plural: 'Clientes' },
  appointment: { singular: 'Turno', plural: 'Turnos' },
  staff: { singular: 'Vendedor', plural: 'Vendedores' },
  resource: { singular: 'Caja', plural: 'Cajas' },
};

export const RETAIL_CLOTHING_VERTICAL: VerticalTemplate = {
  ...BASE,
  key: 'retail_clothing',
  label: 'Tienda de ropa',
  terminology: TERMS,
  productAttributes: [
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'season', label: 'Temporada', type: 'select', options: ['Verano', 'Otoño', 'Invierno', 'Primavera', 'Todo el año'] },
  ],
  variantAxes: [
    { name: 'Talle', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { name: 'Color', values: [] },
  ],
};

export const RETAIL_TECH_VERTICAL: VerticalTemplate = {
  ...BASE,
  key: 'retail_tech',
  label: 'Tienda de tecnología',
  terminology: TERMS,
  productAttributes: [
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'model', label: 'Modelo', type: 'text' },
    { key: 'warrantyMonths', label: 'Garantía (meses)', type: 'number' },
  ],
  variantAxes: [
    { name: 'Capacidad', values: ['64 GB', '128 GB', '256 GB', '512 GB'] },
    { name: 'Color', values: [] },
  ],
};
