import React, { useRef } from 'react';
import { usePDFStore, type ToolType } from '../../store/usePDFStore';
import { 
  MousePointer2, 
  Hand, 
  Pencil, 
  Type, 
  Eraser, 
  ZoomIn, 
  ZoomOut, 
  Upload, 
  Download,
  FileUp
} from 'lucide-react';

export const Toolbar = () => {
  // 1. Conectamos con el cerebro (Zustand)
  const { 
    activeTool, 
    setActiveTool, 
    zoomLevel, 
    setZoomLevel, 
    pdfFile,
    setPdfFile 
  } = usePDFStore();

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleZoomIn = () => setZoomLevel(zoomLevel + 0.1);
  const handleZoomOut = () => setZoomLevel(zoomLevel - 0.1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSave = () => {
    // Aquí conectaremos la lógica de pdf-lib más adelante
    alert("Funcionalidad de guardar pendiente de implementar con pdf-lib");
  };

  // Helper para clases de botones activos
  const getButtonClass = (tool: ToolType) => {
    const baseClass = "p-2 rounded-lg transition-colors duration-200 flex items-center justify-center";
    return activeTool === tool 
      ? `${baseClass} bg-blue-100 text-blue-600 border border-blue-200` // Activo
      : `${baseClass} hover:bg-gray-100 text-gray-700 border border-transparent`; // Inactivo
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm px-4 py-2 flex items-center justify-between h-16">
      
      {/* SECCIÓN 1: Archivo */}
      <div className="flex items-center gap-2 border-r pr-4 border-gray-300">
        <input 
          type="file" 
          accept="application/pdf" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
        >
          <FileUp size={18} />
          {pdfFile ? "Cambiar PDF" : "Subir PDF"}
        </button>

        <button 
          onClick={handleSave}
          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
          title="Guardar PDF"
        >
          <Download size={20} />
        </button>
      </div>

      {/* SECCIÓN 2: Herramientas de Edición */}
      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <button onClick={() => setActiveTool('select')} className={getButtonClass('select')} title="Seleccionar">
          <MousePointer2 size={20} />
        </button>
        
        <button onClick={() => setActiveTool('hand')} className={getButtonClass('hand')} title="Mover Página (Mano)">
          <Hand size={20} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div> {/* Separador */}

        <button onClick={() => setActiveTool('draw')} className={getButtonClass('draw')} title="Dibujar">
          <Pencil size={20} />
        </button>

        <button onClick={() => setActiveTool('text')} className={getButtonClass('text')} title="Texto">
          <Type size={20} />
        </button>

        <button onClick={() => setActiveTool('eraser')} className={getButtonClass('eraser')} title="Borrador">
          <Eraser size={20} />
        </button>
      </div>

      {/* SECCIÓN 3: Zoom y Vista */}
      <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
        <button 
          onClick={handleZoomOut} 
          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"
        >
          <ZoomOut size={20} />
        </button>
        
        <span className="w-16 text-center text-sm font-semibold text-gray-700 select-none">
          {Math.round(zoomLevel * 100)}%
        </span>
        
        <button 
          onClick={handleZoomIn} 
          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"
        >
          <ZoomIn size={20} />
        </button>
      </div>
    </div>
  );
};