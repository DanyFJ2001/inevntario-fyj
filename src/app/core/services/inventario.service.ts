import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDocs,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private collectionName = 'productos';

  constructor(private firestore: Firestore) {}

  /**
   * Obtener todos los productos en tiempo real
   */
  obtenerProductos(): Observable<Producto[]> {
    const productosRef = collection(this.firestore, this.collectionName);
    const q = query(productosRef, orderBy('fecha', 'desc'));
    
    return collectionData(q, { idField: 'id' }) as Observable<Producto[]>;
  }

  /**
   * Buscar producto por código de barras
   */
  buscarPorCodigoBarras(codigo: string): Observable<Producto | null> {
    const productosRef = collection(this.firestore, this.collectionName);
    const q = query(productosRef, where('codigoBarras', '==', codigo));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Producto;
      })
    );
  }

  /**
   * Agregar nuevo producto
   */
  agregarProducto(producto: Producto): Observable<string> {
    const productosRef = collection(this.firestore, this.collectionName);
    const nuevoProducto = {
      ...producto,
      fecha: Timestamp.now(),
      alertaActiva: producto.stock < producto.stockMinimo
    };
    
    return from(addDoc(productosRef, nuevoProducto)).pipe(
      map(docRef => docRef.id)
    );
  }

  /**
   * Actualizar stock de producto existente
   */
  actualizarStock(id: string, cantidadAgregar: number, stockActual: number, stockMinimo: number): Observable<void> {
    const productoRef = doc(this.firestore, `${this.collectionName}/${id}`);
    const nuevoStock = stockActual + cantidadAgregar;
    
    return from(updateDoc(productoRef, {
      stock: nuevoStock,
      alertaActiva: nuevoStock < stockMinimo,
      fecha: Timestamp.now()
    }));
  }

  /**
   * Editar producto completo
   */
  editarProducto(id: string, producto: Partial<Producto>): Observable<void> {
    const productoRef = doc(this.firestore, `${this.collectionName}/${id}`);
    
    return from(updateDoc(productoRef, {
      ...producto,
      fecha: Timestamp.now()
    }));
  }

  /**
   * Eliminar producto
   */
  eliminarProducto(id: string): Observable<void> {
    const productoRef = doc(this.firestore, `${this.collectionName}/${id}`);
    return from(deleteDoc(productoRef));
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
      return { tipo: 'critico', color: '#ef4444', icono: '🔴' };
    } else if (stock < stockMinimo) {
      return { tipo: 'bajo', color: '#f59e0b', icono: '🟡' };
    } else {
      return { tipo: 'ok', color: '#10b981', icono: '✅' };
    }
  }
}