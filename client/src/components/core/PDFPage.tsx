import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import * as pdfjs from 'pdfjs-dist';
import { InteractiveCanvas, type PDFTextBox } from './InteractiveCanvas';
import { usePDFStore } from '../../store/usePDFStore';

interface PDFPageProps {
  pageNumber: number;
  pdfDocument: pdfjs.PDFDocumentProxy;
}

export const PDFPage = ({ pageNumber, pdfDocument }: PDFPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [textBoxes, setTextBoxes] = useState<PDFTextBox[]>([]);
  const [textEdit, setTextEdit] = useState<{ box: PDFTextBox; value: string } | null>(null);
  const textEditRef = useRef<typeof textEdit>(null);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  
  const { zoomLevel } = usePDFStore();

  const buildTextBoxes = useCallback((
    textContent: Awaited<ReturnType<pdfjs.PDFPageProxy['getTextContent']>>,
    viewport: pdfjs.PageViewport
  ): PDFTextBox[] => {
    return textContent.items.flatMap((item, index) => {
      if (!('str' in item) || item.str.trim() === '' || !Array.isArray(item.transform)) {
        return [];
      }

      const style = textContent.styles[item.fontName];
      const transform = pdfjs.Util.transform(viewport.transform, item.transform) as number[];
      let angle = Math.atan2(transform[1], transform[0]);

      if (style?.vertical) {
        angle += Math.PI / 2;
      }

      const fontHeight = Math.max(Math.hypot(transform[2], transform[3]), 8);
      const ascentRatio = typeof style?.ascent === 'number' && style.ascent > 0 ? style.ascent : 0.8;
      const fontAscent = fontHeight * ascentRatio;
      const left = angle === 0 ? transform[4] : transform[4] + fontAscent * Math.sin(angle);
      const top = angle === 0 ? transform[5] - fontAscent : transform[5] - fontAscent * Math.cos(angle);
      const width = Math.max(item.width * viewport.scale, item.str.length * fontHeight * 0.35, 12);
      const height = Math.max(item.height * viewport.scale, fontHeight, 10);

      return [{
        id: `${pageNumber}-${index}`,
        text: item.str,
        left,
        top,
        width,
        height,
        fontSize: fontHeight,
        fontFamily: style?.fontFamily || 'Arial',
      }];
    });
  }, [pageNumber]);

  useEffect(() => {
    let isCancelled = false;

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
      const displayViewport = page.getViewport({ scale: zoomLevel });

      // 2. Configurar dimensiones físicas (internas del canvas)
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 3. Dimensiones visuales (CSS)
      const displayWidth = viewport.width / pixelRatio;
      const displayHeight = viewport.height / pixelRatio;

      if (!isCancelled) {
        setDimensions({ width: displayWidth, height: displayHeight });
      }

      // 4. Limpieza robusta (Reiniciar transformación es clave)
      context.resetTransform(); // <--- ESTO ARREGLA PROBLEMAS DE ORIENTACIÓN
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      const renderContext: Parameters<pdfjs.PDFPageProxy['render']>[0] = {
        canvas,
        viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
        const textContent = await page.getTextContent();

        if (!isCancelled) {
          setTextBoxes(buildTextBoxes(textContent, displayViewport));
        }
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'RenderingCancelledException') {
          console.error(`Error renderizando página ${pageNumber}:`, error);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [buildTextBoxes, pdfDocument, pageNumber, zoomLevel]);

  useEffect(() => {
    textEditRef.current = textEdit;
  }, [textEdit]);

  const activeTextEditId = textEdit?.box.id;

  useEffect(() => {
    if (!activeTextEditId) return;

    window.requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });
  }, [activeTextEditId]);

  const commitTextEdit = useCallback(() => {
    const activeEdit = textEditRef.current;
    if (!activeEdit) return;

    textEditRef.current = null;
    setTextEdit(null);
    const canvas = usePDFStore.getState().pageCanvases[pageNumber];
    if (!canvas) return;

    const value = activeEdit.value.trimEnd();
    const box = activeEdit.box;
    const paddingX = Math.max(2, box.fontSize * 0.08);
    const paddingY = Math.max(2, box.fontSize * 0.12);
    const cover = new fabric.Rect({
      left: 0,
      top: 0,
      width: box.width + paddingX * 2,
      height: box.height + paddingY * 2,
      fill: '#ffffff',
      strokeWidth: 0,
      selectable: false,
      evented: false,
    });
    const groupObjects: fabric.FabricObject[] = [cover];

    if (value.trim() !== '') {
      const replacementText = new fabric.Textbox(value, {
        left: paddingX,
        top: paddingY,
        width: Math.max(box.width, 24),
        fill: '#111827',
        fontFamily: box.fontFamily,
        fontSize: box.fontSize,
        lineHeight: 1,
        selectable: false,
        evented: false,
      });

      groupObjects.push(replacementText);
    }

    const replacementGroup = new fabric.Group(groupObjects, {
      left: box.left - paddingX,
      top: box.top - paddingY,
      selectable: true,
      evented: true,
      objectCaching: false,
    });

    canvas.add(replacementGroup);
    canvas.setActiveObject(replacementGroup);
    canvas.requestRenderAll();
    usePDFStore.getState().setActiveTool('select');
  }, [pageNumber]);

  const isLoading = dimensions.width === 0;
  const pageWidth = isLoading ? 600 : dimensions.width;
  const pageHeight = isLoading ? 800 : dimensions.height;

  return (
    <div 
      // AGREGADO: 'shrink-0' evita que flexbox aplaste la página
      className={`relative mb-8 shadow-xl rounded-sm shrink-0 origin-top ${
        isLoading ? 'bg-slate-200 animate-pulse' : 'bg-white'
      }`}
      style={{ 
        width: `${pageWidth}px`, 
        height: `${pageHeight}px` 
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
          width: `${pageWidth}px`, 
          height: `${pageHeight}px`,
          opacity: isLoading ? 0 : 1,
        }}
      />

      {/* CAPA 2: Interactiva */}
      <div className="absolute top-0 left-0 z-10 w-full h-full">
        {!isLoading && (
          <InteractiveCanvas
            pageNumber={pageNumber}
            width={dimensions.width}
            height={dimensions.height}
            textBoxes={textBoxes}
            onPdfTextEditRequest={(box) => setTextEdit({ box, value: box.text })}
          />
        )}
      </div>

      {textEdit && (
        <input
          ref={editInputRef}
          value={textEdit.value}
          onChange={(event) => setTextEdit({ ...textEdit, value: event.target.value })}
          onBlur={commitTextEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTextEdit();
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              textEditRef.current = null;
              setTextEdit(null);
            }
          }}
          className="absolute z-30 rounded-sm border border-blue-500 bg-white px-1 text-slate-950 shadow-lg outline-none ring-2 ring-blue-300"
          style={{
            left: `${textEdit.box.left - 3}px`,
            top: `${textEdit.box.top - 3}px`,
            width: `${Math.max(textEdit.box.width + 12, 48)}px`,
            height: `${Math.max(textEdit.box.height + 8, textEdit.box.fontSize + 10)}px`,
            fontFamily: textEdit.box.fontFamily,
            fontSize: `${textEdit.box.fontSize}px`,
            lineHeight: 1,
          }}
        />
      )}
    </div>
  );
};
