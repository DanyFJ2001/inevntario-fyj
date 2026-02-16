import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {
  private scannerActivo = new BehaviorSubject<boolean>(false);
  public scannerActivo$ = this.scannerActivo.asObservable();

  private codigoEscaneado = new BehaviorSubject<string | null>(null);
  public codigoEscaneado$ = this.codigoEscaneado.asObservable();

  constructor() {}

  /**
   * Iniciar el scanner
   */
  iniciarScanner(): void {
    this.scannerActivo.next(true);
  }

  /**
   * Detener el scanner
   */
  detenerScanner(): void {
    this.scannerActivo.next(false);
    this.codigoEscaneado.next(null);
  }

  /**
   * Emitir código escaneado
   */
  emitirCodigoEscaneado(codigo: string): void {
    this.codigoEscaneado.next(codigo);
  }

  /**
   * Limpiar código escaneado
   */
  limpiarCodigo(): void {
    this.codigoEscaneado.next(null);
  }

  /**
   * Verificar si el scanner está activo
   */
  estaActivo(): boolean {
    return this.scannerActivo.value;
  }

  /**
   * Validar formato de código de barras
   */
  validarCodigoBarras(codigo: string): boolean {
    // Validar que sea numérico y tenga longitud válida (EAN-13, UPC-A, etc)
    const regex = /^\d{8,13}$/;
    return regex.test(codigo);
  }
}