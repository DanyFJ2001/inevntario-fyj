import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Alerta {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  mensaje: string;
  duracion?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private alertas = new BehaviorSubject<Alerta[]>([]);
  public alertas$ = this.alertas.asObservable();

  constructor() {}

  /**
   * Mostrar alerta de éxito
   */
  mostrarExito(mensaje: string, duracion: number = 3000): void {
    this.mostrarAlerta('success', mensaje, duracion);
  }

  /**
   * Mostrar alerta de error
   */
  mostrarError(mensaje: string, duracion: number = 4000): void {
    this.mostrarAlerta('error', mensaje, duracion);
  }

  /**
   * Mostrar alerta de advertencia
   */
  mostrarAdvertencia(mensaje: string, duracion: number = 4000): void {
    this.mostrarAlerta('warning', mensaje, duracion);
  }

  /**
   * Mostrar alerta informativa
   */
  mostrarInfo(mensaje: string, duracion: number = 3000): void {
    this.mostrarAlerta('info', mensaje, duracion);
  }

  /**
   * Mostrar alerta de stock bajo
   */
  mostrarStockBajo(nombreProducto: string, stock: number, stockMinimo: number): void {
    const mensaje = `⚠️ ${nombreProducto}: Stock bajo (${stock}/${stockMinimo})`;
    this.mostrarAdvertencia(mensaje, 5000);
  }

  /**
   * Mostrar alerta genérica
   */
  private mostrarAlerta(tipo: Alerta['tipo'], mensaje: string, duracion: number): void {
    const id = this.generarId();
    const alerta: Alerta = { id, tipo, mensaje, duracion };
    
    const alertasActuales = this.alertas.value;
    this.alertas.next([...alertasActuales, alerta]);

    // Auto-remover después de la duración
    if (duracion > 0) {
      setTimeout(() => this.removerAlerta(id), duracion);
    }
  }

  /**
   * Remover alerta por ID
   */
  removerAlerta(id: string): void {
    const alertasActuales = this.alertas.value.filter(a => a.id !== id);
    this.alertas.next(alertasActuales);
  }

  /**
   * Limpiar todas las alertas
   */
  limpiarAlertas(): void {
    this.alertas.next([]);
  }

  /**
   * Generar ID único
   */
  private generarId(): string {
    return `alerta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}