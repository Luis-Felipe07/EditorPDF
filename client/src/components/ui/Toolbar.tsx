import React, { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { usePDFStore, type ToolType } from '../../store/usePDFStore';
import { 
  MousePointer2, Hand, Pencil, Type, Eraser, 
  ZoomIn, ZoomOut, Upload, Download, FileText, Square,
  type LucideIcon
} from 'lucide-react';

const EDIT_COLORS = ['#ef4444', '#2563eb', '#16a34a', '#111827', '#f59e0b'];

interface ToolButtonProps {
  tool: ToolType;
  icon: LucideIcon;
  label: string;
  activeTool: ToolType;
  onSelect: (tool: ToolType) => void;
}

const ToolButton = ({ tool, icon: Icon, label, activeTool, onSelect }: ToolButtonProps) => (
  <button
    onClick={() => onSelect(tool)}
    title={label}
    className={`
      relative group p-2 rounded-lg transition-all duration-200
      ${activeTool === tool 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' // Estado Activo
        : 'text-slate-400 hover:bg-slate-800 hover:text-white' // Estado Inactivo
      }
    `}
  >
    <Icon size={20} />
    {/* Tooltip simple */}
    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {label}
    </span>
  </button>
);

export const Toolbar = () => {
  const activeTool = usePDFStore((state) => state.activeTool);
  const setActiveTool = usePDFStore((state) => state.setActiveTool);
  const zoomLevel = usePDFStore((state) => state.zoomLevel);
  const setZoomLevel = usePDFStore((state) => state.setZoomLevel);
  const pdfFile = usePDFStore((state) => state.pdfFile);
  const setPdfFile = usePDFStore((state) => state.setPdfFile);
  const editColor = usePDFStore((state) => state.editColor);
  const setEditColor = usePDFStore((state) => state.setEditColor);
  const strokeWidth = usePDFStore((state) => state.strokeWidth);
  const setStrokeWidth = usePDFStore((state) => state.setStrokeWidth);
  const fontSize = usePDFStore((state) => state.fontSize);
  const setFontSize = usePDFStore((state) => state.setFontSize);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleExport = async () => {
    const { pdfFile: currentFile, pageCanvases, zoomLevel: currentZoom } = usePDFStore.getState();

    if (!currentFile) return;

    setIsExporting(true);

    try {
      const originalBytes = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      const pages = pdfDoc.getPages();
      const multiplier = Math.max(2, 1 / currentZoom);

      for (const [pageKey, canvas] of Object.entries(pageCanvases)) {
        const pageIndex = Number(pageKey) - 1;
        const page = pages[pageIndex];

        if (!page || canvas.getObjects().length === 0) continue;

        canvas.discardActiveObject();
        canvas.requestRenderAll();

        const overlayDataUrl = canvas.toDataURL({
          format: 'png',
          multiplier,
        });
        const overlayImage = await pdfDoc.embedPng(overlayDataUrl);

        page.drawImage(overlayImage, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = currentFile.name.replace(/\.pdf$/i, '') || 'documento';

      link.href = url;
      link.download = `${fileName}-editado.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('No se pudo exportar el PDF editado.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 shadow-lg z-50">
      
      {/* SECCIÓN 1: Logo y Archivo (Izquierda) */}
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <FileText size={18} className="text-white" />
          </div>
          <span>Editor<span className="text-blue-500">PDF</span></span>
        </div>

        <div className="h-6 w-px bg-slate-700 mx-2"></div>

        <input 
          type="file" 
          accept="application/pdf" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-full transition-colors border border-slate-700"
        >
          <Upload size={16} />
          {pdfFile ? "Cambiar Archivo" : "Subir PDF"}
        </button>
      </div>

      {/* SECCIÓN 2: Herramientas Centrales (La Isla) */}
      <div className="justify-self-center max-w-full overflow-x-auto flex items-center gap-1 bg-slate-950/50 backdrop-blur-sm p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <ToolButton tool="select" icon={MousePointer2} label="Seleccionar" activeTool={activeTool} onSelect={setActiveTool} />
        <ToolButton tool="hand" icon={Hand} label="Mover" activeTool={activeTool} onSelect={setActiveTool} />
        <div className="w-px h-6 bg-slate-800 mx-1"></div>
        <ToolButton tool="draw" icon={Pencil} label="Dibujar" activeTool={activeTool} onSelect={setActiveTool} />
        <ToolButton tool="text" icon={Type} label="Texto" activeTool={activeTool} onSelect={setActiveTool} />
        <ToolButton tool="rectangle" icon={Square} label="Rectángulo" activeTool={activeTool} onSelect={setActiveTool} />
        <ToolButton tool="eraser" icon={Eraser} label="Borrador" activeTool={activeTool} onSelect={setActiveTool} />
        <div className="w-px h-6 bg-slate-800 mx-1"></div>
        <div className="flex items-center gap-1 px-1">
          {EDIT_COLORS.map((color) => (
            <button
              key={color}
              title={`Color ${color}`}
              onClick={() => setEditColor(color)}
              className={`h-5 w-5 rounded-full border transition-transform ${
                editColor === color ? 'border-white scale-110' : 'border-slate-700'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <input
          title="Grosor"
          type="range"
          min="1"
          max="24"
          value={strokeWidth}
          onChange={(event) => setStrokeWidth(Number(event.target.value))}
          className="w-16 accent-blue-500"
        />
        <input
          title="Tamaño de texto"
          type="range"
          min="10"
          max="48"
          step="2"
          value={fontSize}
          onChange={(event) => setFontSize(Number(event.target.value))}
          className="w-16 accent-blue-500"
        />
      </div>

      {/* SECCIÓN 3: Zoom y Acciones (Derecha) */}
      <div className="flex items-center gap-4 justify-self-end">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button onClick={() => setZoomLevel(zoomLevel - 0.1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-slate-300 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button onClick={() => setZoomLevel(zoomLevel + 0.1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md">
            <ZoomIn size={16} />
          </button>
        </div>

        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExport}
          disabled={!pdfFile || isExporting}
        >
          <Download size={18} />
          {isExporting ? 'Exportando...' : 'Exportar'}
        </button>
      </div>
    </header>
  );
};
