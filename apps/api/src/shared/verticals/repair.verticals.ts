import { VerticalRoleTemplate, VerticalTemplate } from './vertical.types';

/** Roles shared by both repair verticals. */
const REPAIR_ROLES: VerticalRoleTemplate[] = [
  {
    name: 'reception',
    permissions: [
      'customers.create',
      'customers.read',
      'customers.update',
      'work_orders.create',
      'work_orders.read',
      'work_orders.update',
      'staff.read',
      'catalog.read',
      'inventory.read',
      'sales.create',
      'sales.read',
      'sales.update',
    ],
  },
  {
    name: 'technician',
    permissions: [
      'customers.read',
      'work_orders.read',
      'work_orders.update',
      'staff.read',
      'catalog.read',
      'inventory.read',
    ],
  },
];

const BASE = {
  modules: ['customers', 'work_orders', 'catalog', 'sales', 'inventory'],
  homeModule: 'work_orders',
  customerAttributes: [],
  roles: REPAIR_ROLES,
} satisfies Partial<VerticalTemplate>;

export const REPAIR_MECHANIC_VERTICAL: VerticalTemplate = {
  ...BASE,
  key: 'repair_mechanic',
  label: 'Taller mecánico',
  terminology: {
    customer: { singular: 'Cliente', plural: 'Clientes' },
    appointment: { singular: 'Turno', plural: 'Turnos' },
    staff: { singular: 'Mecánico', plural: 'Mecánicos' },
    resource: { singular: 'Elevador', plural: 'Elevadores' },
    workOrder: { singular: 'Orden de trabajo', plural: 'Órdenes de trabajo' },
    asset: { singular: 'Vehículo', plural: 'Vehículos' },
  },
  assetAttributes: [
    { key: 'plate', label: 'Patente', type: 'text', required: true },
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'model', label: 'Modelo', type: 'text' },
    { key: 'year', label: 'Año', type: 'number' },
    { key: 'mileage', label: 'Kilometraje', type: 'number' },
    { key: 'fuel', label: 'Combustible', type: 'select', options: ['Nafta', 'Diésel', 'GNC', 'Eléctrico', 'Híbrido'] },
    { key: 'vin', label: 'Nº de chasis (VIN)', type: 'text' },
  ],
};

export const REPAIR_TECH_VERTICAL: VerticalTemplate = {
  ...BASE,
  key: 'repair_tech',
  label: 'Servicio técnico',
  terminology: {
    customer: { singular: 'Cliente', plural: 'Clientes' },
    appointment: { singular: 'Turno', plural: 'Turnos' },
    staff: { singular: 'Técnico', plural: 'Técnicos' },
    resource: { singular: 'Puesto', plural: 'Puestos' },
    workOrder: { singular: 'Orden de servicio', plural: 'Órdenes de servicio' },
    asset: { singular: 'Equipo', plural: 'Equipos' },
  },
  assetAttributes: [
    {
      key: 'kind',
      label: 'Tipo de equipo',
      type: 'select',
      options: ['Celular', 'Notebook', 'PC', 'Tablet', 'Consola', 'Televisor', 'Otro'],
    },
    { key: 'brand', label: 'Marca', type: 'text' },
    { key: 'model', label: 'Modelo', type: 'text' },
    { key: 'serial', label: 'Nº de serie / IMEI', type: 'text' },
    { key: 'accessories', label: 'Accesorios entregados', type: 'text' },
    { key: 'unlockCode', label: 'Patrón / código de desbloqueo', type: 'text' },
  ],
};
