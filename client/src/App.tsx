import { Toolbar } from './components/ui/Toolbar';
import { usePDFStore } from './store/usePDFStore';

function App() {
  const { pdfFile } = usePDFStore();

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 1. La Barra de Herramientas siempre visible arriba */}
      <Toolbar />

      {/* 2. Área de Trabajo */}
      <main className="flex-1 overflow-auto flex justify-center p-8">
        {pdfFile ? (
          // Aquí irá tu componente que renderiza el PDF
          <div className="bg-white shadow-2xl">
             {/* <PDFViewer file={pdfFile} /> */}
             <p className="p-10">Cargando PDF...</p> 
          </div>
        ) : (
          // Estado vacío (Empty State)
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Sube un PDF para comenzar a editar</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;