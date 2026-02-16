import { Routes } from '@angular/router';

export const routes: Routes = [
  // 🔹 Página principal
  {
    path: '',
    redirectTo: 'inventario',
    pathMatch: 'full'
  },
  // 🔹 Inventario
  {
    path: 'inventario',
    loadComponent: () =>
      import('./modules/inventario/inventario/inventario.component')
        .then(m => m.InventarioComponent)
  },
  // 🚫 Cualquier ruta inválida
  {
    path: '**',
    redirectTo: 'inventario'
  }
];