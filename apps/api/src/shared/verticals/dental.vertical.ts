import { VerticalTemplate } from './vertical.types';

export const DENTAL_VERTICAL: VerticalTemplate = {
  key: 'dental',
  label: 'Clínica dental',
  modules: ['customers', 'scheduling', 'catalog', 'sales'],
  homeModule: 'scheduling',
  terminology: {
    customer: { singular: 'Paciente', plural: 'Pacientes' },
    appointment: { singular: 'Turno', plural: 'Turnos' },
    staff: { singular: 'Profesional', plural: 'Profesionales' },
    resource: { singular: 'Sillón', plural: 'Sillones' },
  },
  customerAttributes: [
    { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
    { key: 'healthInsurance', label: 'Obra social / prepaga', type: 'text' },
    { key: 'healthInsuranceNumber', label: 'Nº de afiliado', type: 'text' },
  ],
  roles: [
    {
      name: 'reception',
      permissions: [
        'customers.create',
        'customers.read',
        'customers.update',
        'appointments.create',
        'appointments.read',
        'appointments.update',
        'appointments.delete',
        'staff.read',
        'staff.update',
        'catalog.read',
        'sales.create',
        'sales.read',
        'sales.update',
      ],
    },
    {
      name: 'professional',
      permissions: [
        'customers.read',
        'customers.update',
        'appointments.read',
        'appointments.update',
        'staff.read',
        'catalog.read',
        'sales.read',
      ],
    },
  ],
};
