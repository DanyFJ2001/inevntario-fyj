import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Producto } from '../../../core/models/producto.model';
import { InventarioService } from '../../../core/services/inventario.service';
import { BarcodeScannerService } from '../../../core/services/barcode-scanner.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { ScannerCameraComponent } from '../scanner-camera/scanner-camera.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScannerCameraComponent
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados
  scannerActivo = false;
  mostrarFormulario = false;
  modoEdicion = false;
  modoEdicionCompleta = false; // Nueva bandera para edición completa
  cargando = false;

  // Datos
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  productoActual: Producto | null = null;
  
  // Formulario
  formularioProducto!: FormGroup;
  categorias = [
    'Aceites',
    'Filtros',
    'Bujías',
    'Frenos',
    'Refrigerantes',
    'Transmisión',
    'Limpieza',
    'Aditivos',
    'Otros'
  ];

  // Búsqueda y filtros
  terminoBusqueda = '';
  filtroActivo: 'todos' | 'critico' | 'bajo' | 'ok' = 'todos';

  constructor(
    private fb: FormBuilder,
    private inventarioService: InventarioService,
    private scannerService: BarcodeScannerService,
    private alertasService: AlertasService
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar formulario reactivo
   */
  private inicializarFormulario(): void {
    this.formularioProducto = this.fb.group({
      codigoBarras: ['', Validators.required],
      nombre: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      precioMayoreo: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [0, [Validators.required, Validators.min(0)]],
      categoria: ['', Validators.required],
      cantidadAgregar: [0]
    });
  }

  /**
   * Cargar productos desde Realtime Database
   */
  private cargarProductos(): void {
    this.cargando = true;
    this.inventarioService.obtenerProductos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.productos = productos;
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.alertasService.mostrarError('Error al cargar productos');
          this.cargando = false;
        }
      });
  }

  /**
   * Activar/Desactivar scanner
   */
  toggleScanner(): void {
    this.scannerActivo = !this.scannerActivo;
    if (!this.scannerActivo) {
      this.cerrarFormulario();
    }
  }

  /**
   * Procesar código escaneado
   */
  procesarCodigoEscaneado(codigo: string): void {
    console.log('Código escaneado:', codigo);
    
    // CERRAR SCANNER INMEDIATAMENTE
    this.scannerActivo = false;
    
    // MOSTRAR FORMULARIO CON CÓDIGO INMEDIATAMENTE
    this.formularioProducto.patchValue({ codigoBarras: codigo });
    this.mostrarFormulario = true;
    
    // Buscar en Realtime Database en segundo plano
    this.cargando = true;
    
    this.inventarioService.buscarPorCodigoBarras(codigo)
      .subscribe({
        next: (producto) => {
          if (producto) {
            // Producto existe - Actualizar formulario
            this.productoActual = producto;
            this.modoEdicion = true;
            this.modoEdicionCompleta = false;
            this.cargarProductoEnFormulario(producto);
            this.alertasService.mostrarInfo(`✓ Producto: ${producto.nombre}`);
          } else {
            // Producto nuevo - formulario ya está listo
            this.productoActual = null;
            this.modoEdicion = false;
            this.modoEdicionCompleta = false;
            this.alertasService.mostrarInfo('➕ Producto nuevo');
          }
          
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al buscar producto:', error);
          this.alertasService.mostrarError('❌ Error al buscar');
          this.cargando = false;
        }
      });
  }

  /**
   * Abrir modal para editar producto completo
   */
  abrirEdicionProducto(producto: Producto): void {
    this.productoActual = producto;
    this.modoEdicion = false;
    this.modoEdicionCompleta = true;
    this.mostrarFormulario = true;
    
    // Cargar todos los datos habilitados para edición
    this.formularioProducto.patchValue({
      codigoBarras: producto.codigoBarras,
      nombre: producto.nombre,
      precio: producto.precio,
      precioMayoreo: producto.precioMayoreo,
      stock: producto.stock,
      stockMinimo: producto.stockMinimo,
      categoria: producto.categoria,
      cantidadAgregar: 0
    });

    // Habilitar todos los campos para edición
    this.formularioProducto.enable();
  }

  /**
   * Cargar datos del producto en el formulario (solo para agregar stock)
   */
  private cargarProductoEnFormulario(producto: Producto): void {
    this.formularioProducto.patchValue({
      codigoBarras: producto.codigoBarras,
      nombre: producto.nombre,
      precio: producto.precio,
      precioMayoreo: producto.precioMayoreo,
      stock: producto.stock,
      stockMinimo: producto.stockMinimo,
      categoria: producto.categoria,
      cantidadAgregar: 0
    });

    // Deshabilitar campos en modo agregar stock
    this.formularioProducto.get('codigoBarras')?.disable();
    this.formularioProducto.get('nombre')?.disable();
    this.formularioProducto.get('precio')?.disable();
    this.formularioProducto.get('precioMayoreo')?.disable();
    this.formularioProducto.get('stock')?.disable();
    this.formularioProducto.get('stockMinimo')?.disable();
    this.formularioProducto.get('categoria')?.disable();
  }

  /**
   * Guardar producto (nuevo, actualizar stock o editar completo)
   */
  guardarProducto(): void {
    if (this.formularioProducto.invalid) {
      this.alertasService.mostrarError('⚠️ Complete todos los campos');
      return;
    }

    this.cargando = true;

    if (this.modoEdicionCompleta && this.productoActual) {
      // Editar producto completo
      this.editarProductoCompleto();
    } else if (this.modoEdicion && this.productoActual) {
      // Actualizar stock
      this.actualizarStock();
    } else {
      // Agregar nuevo producto
      this.agregarNuevoProducto();
    }
  }

  /**
   * Editar producto completo
   */
  private editarProductoCompleto(): void {
    if (!this.productoActual) return;

    const productoEditado: Partial<Producto> = {
      codigoBarras: this.formularioProducto.get('codigoBarras')?.value,
      nombre: this.formularioProducto.get('nombre')?.value,
      precio: Number(this.formularioProducto.get('precio')?.value),
      precioMayoreo: Number(this.formularioProducto.get('precioMayoreo')?.value),
      stock: Number(this.formularioProducto.get('stock')?.value),
      stockMinimo: Number(this.formularioProducto.get('stockMinimo')?.value),
      categoria: this.formularioProducto.get('categoria')?.value
    };

    this.inventarioService.editarProducto(this.productoActual.id!, productoEditado)
      .subscribe({
        next: () => {
          this.alertasService.mostrarExito('✅ Producto actualizado');
          this.cerrarFormulario();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al editar producto:', error);
          this.alertasService.mostrarError('❌ Error al actualizar');
          this.cargando = false;
        }
      });
  }

  /**
   * Agregar nuevo producto
   */
  private agregarNuevoProducto(): void {
    const nuevoProducto: Producto = {
      codigoBarras: this.formularioProducto.get('codigoBarras')?.value,
      nombre: this.formularioProducto.get('nombre')?.value,
      precio: Number(this.formularioProducto.get('precio')?.value),
      precioMayoreo: Number(this.formularioProducto.get('precioMayoreo')?.value),
      stock: Number(this.formularioProducto.get('stock')?.value),
      stockMinimo: Number(this.formularioProducto.get('stockMinimo')?.value),
      categoria: this.formularioProducto.get('categoria')?.value,
      fecha: new Date()
    };

    this.inventarioService.agregarProducto(nuevoProducto)
      .subscribe({
        next: () => {
          this.alertasService.mostrarExito('✅ Producto agregado');
          
          // Verificar si el stock está bajo
          if (nuevoProducto.stock < nuevoProducto.stockMinimo) {
            this.alertasService.mostrarStockBajo(
              nuevoProducto.nombre,
              nuevoProducto.stock,
              nuevoProducto.stockMinimo
            );
          }
          
          this.cerrarFormulario();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al agregar producto:', error);
          this.alertasService.mostrarError('❌ Error al guardar');
          this.cargando = false;
        }
      });
  }

  /**
   * Actualizar stock de producto existente
   */
  private actualizarStock(): void {
    if (!this.productoActual) return;

    const cantidadAgregar = Number(this.formularioProducto.get('cantidadAgregar')?.value);
    
    if (cantidadAgregar === 0) {
      this.alertasService.mostrarAdvertencia('⚠️ Ingrese cantidad');
      this.cargando = false;
      return;
    }

    this.inventarioService.actualizarStock(
      this.productoActual.id!,
      cantidadAgregar,
      this.productoActual.stock,
      this.productoActual.stockMinimo
    ).subscribe({
      next: () => {
        const nuevoStock = this.productoActual!.stock + cantidadAgregar;
        this.alertasService.mostrarExito(`✅ Stock: ${nuevoStock} unidades`);
        
        // Verificar si aún está bajo después de la actualización
        if (nuevoStock < this.productoActual!.stockMinimo) {
          this.alertasService.mostrarStockBajo(
            this.productoActual!.nombre,
            nuevoStock,
            this.productoActual!.stockMinimo
          );
        }
        
        this.cerrarFormulario();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al actualizar stock:', error);
        this.alertasService.mostrarError('❌ Error al actualizar');
        this.cargando = false;
      }
    });
  }

  /**
   * Cerrar formulario y resetear
   */
  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.modoEdicionCompleta = false;
    this.productoActual = null;
    this.formularioProducto.reset();
    this.formularioProducto.enable();
  }

  /**
   * Eliminar producto
   */
  eliminarProducto(producto: Producto): void {
    if (!confirm(`¿Eliminar ${producto.nombre}?`)) return;

    this.inventarioService.eliminarProducto(producto.id!)
      .subscribe({
        next: () => {
          this.alertasService.mostrarExito('✅ Producto eliminado');
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.alertasService.mostrarError('❌ Error al eliminar');
        }
      });
  }

  /**
   * Aplicar filtros y búsqueda
   */
  aplicarFiltros(): void {
    let resultado = [...this.productos];

    // Filtro por término de búsqueda
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(termino) ||
        p.codigoBarras.includes(termino) ||
        p.categoria.toLowerCase().includes(termino)
      );
    }

    // Filtro por estado de stock
    if (this.filtroActivo !== 'todos') {
      resultado = resultado.filter(p => {
        const estado = this.inventarioService.obtenerEstadoStock(p.stock, p.stockMinimo);
        return estado.tipo === this.filtroActivo;
      });
    }

    this.productosFiltrados = resultado;
  }

  /**
   * Cambiar filtro activo
   */
  cambiarFiltro(filtro: typeof this.filtroActivo): void {
    this.filtroActivo = filtro;
    this.aplicarFiltros();
  }

  /**
   * Obtener estado del stock para vista
   */
  getEstadoStock(producto: Producto) {
    return this.inventarioService.obtenerEstadoStock(producto.stock, producto.stockMinimo);
  }

  /**
   * Contar productos por estado
   */
  contarPorEstado(tipo: 'critico' | 'bajo' | 'ok'): number {
    return this.productos.filter(p => {
      const estado = this.inventarioService.obtenerEstadoStock(p.stock, p.stockMinimo);
      return estado.tipo === tipo;
    }).length;
  }
}