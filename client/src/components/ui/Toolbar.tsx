import React, { useRef } from 'react';
import { usePDFStore, type ToolType } from '../../store/usePDFStore';
import { 
  MousePointer2, Hand, Pencil, Type, Eraser, 
  ZoomIn, ZoomOut, Upload, Download, FileText, ChevronDown 
} from 'lucide-react';

export const Toolbar = () => {
  const { 
    activeTool, setActiveTool, 
    zoomLevel, setZoomLevel, 
    pdfFile, setPdfFile 
  } = usePDFStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  // Botón reutilizable para herramientas con estilo "activo"
  const ToolButton = ({ tool, icon: Icon, label }: { tool: ToolType, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTool(tool)}
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

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shadow-lg z-50">
      
      {/* SECCIÓN 1: Logo y Archivo (Izquierda) */}
      <div className="flex items-center gap-6">
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
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/50 backdrop-blur-sm p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <ToolButton tool="select" icon={MousePointer2} label="Seleccionar" />
        <ToolButton tool="hand" icon={Hand} label="Mover" />
        <div className="w-px h-6 bg-slate-800 mx-1"></div>
        <ToolButton tool="draw" icon={Pencil} label="Dibujar" />
        <ToolButton tool="text" icon={Type} label="Texto" />
        <ToolButton tool="eraser" icon={Eraser} label="Borrador" />
      </div>

      {/* SECCIÓN 3: Zoom y Acciones (Derecha) */}
      <div className="flex items-center gap-4">
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
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
          onClick={() => alert("Próximamente: Exportar PDF modificado")}
        >
          <Download size={18} />
          Exportar
        </button>
      </div>
    </header>
  );
};