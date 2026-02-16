import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Declarar tipo global para BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

@Component({
  selector: 'app-scanner-camera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scanner-camera.component.html',
  styleUrls: ['./scanner-camera.component.css']
})
export class ScannerCameraComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElementRef!: ElementRef<HTMLCanvasElement>;
  
  @Output() codigoDetectado = new EventEmitter<string>();

  private stream: MediaStream | null = null;
  private scanning = false;
  public lastScanned = '';
  private barcodeDetector: any = null;

  async ngAfterViewInit() {
    await this.iniciarCamera();
  }

  ngOnDestroy() {
    this.detenerCamera();
  }

  private async iniciarCamera() {
    try {
      // Verificar si BarcodeDetector está disponible
      if ('BarcodeDetector' in window) {
        this.barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93']
        });
      } else {
        alert('Tu navegador no soporta detección de códigos de barras. Usa Chrome o Edge.');
        return;
      }

      // Solicitar acceso a la cámara
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Cámara trasera en móvil
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const video = this.videoElementRef.nativeElement;
      video.srcObject = this.stream;
      
      // Esperar a que el video esté listo
      await video.play();

      // Iniciar escaneo continuo
      this.scanning = true;
      this.escanearContinuamente();

    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos en tu navegador.');
    }
  }

  private async escanearContinuamente() {
    if (!this.scanning || !this.barcodeDetector) return;

    try {
      const video = this.videoElementRef.nativeElement;
      const canvas = this.canvasElementRef.nativeElement;
      const context = canvas.getContext('2d')!;

      // Ajustar tamaño del canvas al video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capturar frame actual
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detectar códigos de barras
      const barcodes = await this.barcodeDetector.detect(canvas);

      if (barcodes.length > 0) {
        const codigo = barcodes[0].rawValue;
        
        // Solo emitir si es un código nuevo
        if (codigo && codigo !== this.lastScanned) {
          this.lastScanned = codigo;
          this.codigoDetectado.emit(codigo);
          
          // Vibrar si está disponible
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          
          // Limpiar después de 3 segundos
          setTimeout(() => {
            this.lastScanned = '';
          }, 3000);
        }
      }

    } catch (error) {
      // Continuar escaneando incluso si hay errores
    }

    // Continuar escaneando (60 FPS aproximadamente)
    if (this.scanning) {
      setTimeout(() => this.escanearContinuamente(), 100);
    }
  }

  private detenerCamera() {
    this.scanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}