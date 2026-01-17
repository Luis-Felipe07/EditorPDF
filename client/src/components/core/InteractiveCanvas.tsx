import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { usePDFStore } from '../../store/usePDFStore';

interface InteractiveCanvasProps {
  width: number;
  height: number;
}

export const InteractiveCanvas = ({ width, height }: InteractiveCanvasProps) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const { setFabricCanvas, activeTool } = usePDFStore();
  
  // Referencia local para limpieza
  const fabricRef = useRef<fabric.Canvas | null>(null);

  // 1. Inicializar Fabric
  useEffect(() => {
    if (!canvasEl.current) return;

    // Creamos la instancia de Fabric
    const canvas = new fabric.Canvas(canvasEl.current, {
      height: height,
      width: width,
      backgroundColor: 'transparent', // CLAVE: Transparente para ver el PDF abajo
      selection: true, // Permitir selección múltiple
    });

    fabricRef.current = canvas;
    setFabricCanvas(canvas); // Guardamos en Zustand

    // Limpieza al desmontar el componente (cambiar de página)
    return () => {
      canvas.dispose();
      setFabricCanvas(null as any);
    };
  }, [height, width, setFabricCanvas]);

  // 2. Escuchar cambios de herramienta (Tool switching)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (activeTool === 'draw') {
  canvas.isDrawingMode = true;


  const brush = new fabric.PencilBrush(canvas);
  brush.width = 5;
  brush.color = 'red';
  
  canvas.freeDrawingBrush = brush;

} else {
  canvas.isDrawingMode = false;
}
    
    // Si la herramienta es 'text', no hacemos nada aquí, 
    // lo manejaremos con un click en la UI para "Agregar Texto"
    
  }, [activeTool]);

  return (
    <div className="absolute top-0 left-0 z-10">
      <canvas ref={canvasEl} />
    </div>
  );
};