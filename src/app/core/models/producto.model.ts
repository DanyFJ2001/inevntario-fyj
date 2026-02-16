export interface Producto {
  id?: string;
  codigoBarras: string;
  nombre: string;
  precio: number;
  precioMayoreo: number;
  stock: number;
  stockMinimo: number;
  categoria: string;
  fecha: Date;
  alertaActiva?: boolean;
}

export interface EstadoStock {
  tipo: 'critico' | 'bajo' | 'ok';
  color: string;
  icono: string;
}