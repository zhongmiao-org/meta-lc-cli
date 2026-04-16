import type { AppDslV1 } from '../types/app-dsl';

export function createAppDslTemplate(): AppDslV1 {
  return {
    version: 'app-dsl.v1',
    app: {
      id: 'demo-app',
      name: 'Demo App',
      version: '0.1.0'
    },
    tenants: [
      { id: 'tenant-a', name: 'Tenant A' },
      { id: 'tenant-b', name: 'Tenant B' }
    ],
    roles: [
      { id: 'manager', name: 'Manager', scopes: ['DEPT_AND_CHILDREN'] },
      { id: 'staff', name: 'Staff', scopes: ['DEPT'] }
    ],
    resources: [
      { id: 'orders-query', name: 'Orders Query', method: 'query', endpoint: '/query' },
      { id: 'orders-mutation', name: 'Orders Mutation', method: 'mutation', endpoint: '/mutation' }
    ],
    pages: [
      { id: 'orders-page', title: 'Orders', route: '/orders', resources: ['orders-query', 'orders-mutation'] }
    ]
  };
}
