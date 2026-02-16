import { Injectable } from '@angular/core';
import { 
  Database, 
  ref, 
  set, 
  get,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo,
  onValue
} from '@angular/fire/database';
import { Observable, from, map } from 'rxjs';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private dbPath = 'productos';

  constructor(private db: Database) {}

  /**
   * Obtener todos los productos en tiempo real
   */
  obtenerProductos(): Observable<Producto[]> {
    const productosRef = ref(this.db, this.dbPath);
    
    return new Observable(observer => {
      const unsubscribe = onValue(productosRef, (snapshot) => {
        const productos: Producto[] = [];
        
        snapshot.forEach((childSnapshot) => {
          const producto = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          } as Producto;
          
          // Convertir fecha de timestamp a Date
          if (producto.fecha) {
            producto.fecha = new Date(producto.fecha);
          }
          
          productos.push(producto);
        });
        
        // Ordenar por fecha (más recientes primero)
        productos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        
        observer.next(productos);
      }, (error) => {
        observer.error(error);
      });

      // Cleanup
      return () => unsubscribe();
    });
  }

  /**
   * Buscar producto por código de barras (SUPER RÁPIDO)
   */
  buscarPorCodigoBarras(codigo: string): Observable<Producto | null> {
    const productosRef = ref(this.db, this.dbPath);
    const productosQuery = query(
      productosRef, 
      orderByChild('codigoBarras'), 
      equalTo(codigo)
    );

    return from(get(productosQuery)).pipe(
      map(snapshot => {
        if (!snapshot.exists()) return null;
        
        let producto: Producto | null = null;
        
        snapshot.forEach((childSnapshot) => {
          producto = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          } as Producto;
          
          // Convertir fecha
          if (producto.fecha) {
            producto.fecha = new Date(producto.fecha);
          }
        });
        
        return producto;
      })
    );
  }

  /**
   * Agregar nuevo producto
   */
  agregarProducto(producto: Producto): Observable<string> {
    const productosRef = ref(this.db, this.dbPath);
    const nuevoProductoRef = push(productosRef);
    
    const productoData = {
      ...producto,
      fecha: producto.fecha.getTime(),
      alertaActiva: producto.stock < producto.stockMinimo
    };

    return from(set(nuevoProductoRef, productoData)).pipe(
      map(() => nuevoProductoRef.key!)
    );
  }

  /**
   * Actualizar stock de producto existente
   */
  actualizarStock(
    id: string, 
    cantidadAgregar: number, 
    stockActual: number, 
    stockMinimo: number
  ): Observable<void> {
    const productoRef = ref(this.db, `${this.dbPath}/${id}`);
    const nuevoStock = stockActual + cantidadAgregar;
    
    const updates = {
      stock: nuevoStock,
      alertaActiva: nuevoStock < stockMinimo,
      fecha: Date.now()
    };

    return from(update(productoRef, updates));
  }

  /**
   * Editar producto completo
   */
  editarProducto(id: string, producto: Partial<Producto>): Observable<void> {
    const productoRef = ref(this.db, `${this.dbPath}/${id}`);
    
    const updates = {
      ...producto,
      fecha: Date.now()
    };

    return from(update(productoRef, updates));
  }

  /**
   * Eliminar producto
   */
  eliminarProducto(id: string): Observable<void> {
    const productoRef = ref(this.db, `${this.dbPath}/${id}`);
    return from(remove(productoRef));
  }

  /**
   * Obtener productos con stock bajo
   */
  obtenerProductosStockBajo(): Observable<Producto[]> {
    return this.obtenerProductos().pipe(
      map(productos => productos.filter(p => p.stock < p.stockMinimo))
    );
  }

  /**
   * Determinar estado del stock
   */
  obtenerEstadoStock(stock: number, stockMinimo: number) {
    if (stock === 0) {
      return { tipo: 'critico' as const, color: '#ef4444', icono: '🔴' };
    } else if (stock < stockMinimo) {
      return { tipo: 'bajo' as const, color: '#f59e0b', icono: '🟡' };
    } else {
      return { tipo: 'ok' as const, color: '#10b981', icono: '✅' };
    }
  }
}