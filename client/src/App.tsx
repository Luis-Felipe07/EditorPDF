import { Toolbar } from './components/ui/Toolbar';
import { usePDFStore } from './store/usePDFStore';
import { PDFViewer } from './components/core/PDFViewer';

function App() {
  const { pdfFile } = usePDFStore();

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900">
      {/* 1. Header / Toolbar Fijo arriba */}
      <Toolbar />

      {/* 2. Área de Trabajo (El "Escritorio") */}
      <main className="flex-1 overflow-auto relative flex justify-center p-8 bg-slate-100">
        
        {pdfFile ? (
          // Contenedor del PDF con sombra realista
          <div className="flex flex-col gap-4 shadow-2xl rounded-sm">
             <PDFViewer />
          </div>
        ) : (
          // Estado Vacío (Empty State) Bonito
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-80 animate-in fade-in duration-700">
            <div className="w-24 h-32 border-4 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4 bg-slate-50">
               <span className="text-4xl">📄</span>
            </div>
            <p className="text-lg font-medium text-slate-600">Tu espacio de trabajo está vacío</p>
            <p className="text-sm mt-1 text-slate-500">Sube un PDF para comenzar la magia</p>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;