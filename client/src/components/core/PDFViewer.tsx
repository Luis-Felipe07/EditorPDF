import { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { usePDFStore } from '../../store/usePDFStore';
import { PDFPage } from './PDFPage';

// Aseguramos la ruta del worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export const PDFViewer = () => {
  const { pdfFile, setTotalPages } = usePDFStore();
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);

  useEffect(() => {
    const loadPDFDocument = async () => {
      if (!pdfFile) return;

      // Limpiamos estado anterior
      setPdfDocument(null);

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;

        setTotalPages(pdf.numPages);
        setPdfDocument(pdf); // Guardamos LA REFERENCIA al documento, no las páginas
      } catch (error) {
        console.error("Error cargando el documento:", error);
      }
    };

    loadPDFDocument();
  }, [pdfFile, setTotalPages]);

  if (!pdfDocument) {
    return <div className="p-10 text-slate-500">Cargando documento...</div>;
  }

  // TRUCO DE MAGIA:
  // Creamos un array de índices [1, 2, 3...] basado en el número de páginas.
  // Renderizamos componentes individuales inmediatamente.
  return (
    <div className="flex flex-col items-center py-8 gap-6 bg-slate-100 min-h-full">
      {Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1).map((pageNum) => (
        <PDFPage 
          key={`page-${pageNum}`} 
          pageNumber={pageNum} 
          pdfDocument={pdfDocument} 
        />
      ))}
    </div>
  );
};