import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { InteractiveCanvas } from './InteractiveCanvas';
import { usePDFStore } from '../../store/usePDFStore';

interface PDFPageProps {
  pageNumber: number;
  pdfDocument: pdfjs.PDFDocumentProxy;
}

export const PDFPage = ({ pageNumber, pdfDocument }: PDFPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  
  const { zoomLevel } = usePDFStore();

  useEffect(() => {
    const renderPage = async () => {
      let page: pdfjs.PDFPageProxy;
      try {
        page = await pdfDocument.getPage(pageNumber);
      } catch (err) {
        console.error(`Error página ${pageNumber}`, err);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      // 1. Calcular escala para alta resolución (evita lo borroso)
      const pixelRatio = window.devicePixelRatio || 1;
      const totalScale = zoomLevel * pixelRatio;
      
      const viewport = page.getViewport({ scale: totalScale });

      // 2. Configurar dimensiones físicas (internas del canvas)
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 3. Dimensiones visuales (CSS)
      const displayWidth = viewport.width / pixelRatio;
      const displayHeight = viewport.height / pixelRatio;

      setDimensions({ width: displayWidth, height: displayHeight });

      // 4. Limpieza robusta (Reiniciar transformación es clave)
      context.resetTransform(); // <--- ESTO ARREGLA PROBLEMAS DE ORIENTACIÓN
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error(`Error renderizando página ${pageNumber}:`, error);
        }
      }
    };

    renderPage();

    return () => {
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, zoomLevel]);

  // Si no ha cargado, mostramos el esqueleto
  if (dimensions.width === 0) {
    return (
      <div className="mb-8 shadow-xl bg-slate-200 animate-pulse rounded-sm relative shrink-0" 
           style={{ width: '600px', height: '800px' }}>
      </div>
    );
  }

  return (
    <div 
      // AGREGADO: 'shrink-0' evita que flexbox aplaste la página
      className="relative mb-8 shadow-xl bg-white rounded-sm shrink-0 origin-top"
      style={{ 
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px` 
      }}
    >
      <div className="absolute -top-7 left-0 text-sm font-medium text-slate-500 select-none">
        Página {pageNumber}
      </div>

      {/* CAPA 1: PDF */}
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 z-0 pointer-events-none"
        // Usamos pixeles explícitos en lugar de 100% para evitar redondeos raros
        style={{ 
          width: `${dimensions.width}px`, 
          height: `${dimensions.height}px` 
        }}
      />

      {/* CAPA 2: Interactiva */}
      <div className="absolute top-0 left-0 z-10 w-full h-full">
        <InteractiveCanvas width={dimensions.width} height={dimensions.height} />
      </div>
    </div>
  );
};