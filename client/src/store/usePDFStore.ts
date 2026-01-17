import { create } from 'zustand';
import * as fabric from 'fabric'; // Importante: el fix que vimos antes

// Definimos los tipos de herramientas para evitar errores de dedo
export type ToolType = 'select' | 'hand' | 'text' | 'draw' | 'eraser' | 'rectangle';

interface PDFState {
  // --- 1. Estado de la Interfaz ---
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // --- 2. Estado del Canvas Activo ---
  // Guardamos la referencia del canvas de la página que el usuario está tocando.
  // Esto permite que la Barra de Herramientas sepa dónde agregar el texto.
  fabricCanvas: fabric.Canvas | null;
  setFabricCanvas: (canvas: fabric.Canvas | null) => void;

  // --- 3. Estado de Navegación y Vista ---
  zoomLevel: number;       // 1.0 = 100%, 1.5 = 150%
  setZoomLevel: (level: number) => void;
  
  currentPage: number;     // Para mostrar "Página 1 de 50"
  setCurrentPage: (page: number) => void;
  
  totalPages: number;
  setTotalPages: (total: number) => void;

  // --- 4. El Archivo ---
  pdfFile: File | null;    // El archivo crudo subido por el usuario
  setPdfFile: (file: File | null) => void;
}

export const usePDFStore = create<PDFState>((set) => ({
  // Valores Iniciales
  activeTool: 'select',
  fabricCanvas: null,
  zoomLevel: 1.0, 
  currentPage: 1,
  totalPages: 0,
  pdfFile: null,

  // Acciones (Setters)
  setActiveTool: (tool) => set({ activeTool: tool }),
  setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  
  // Lógica extra para el zoom: evitamos valores negativos o absurdos
  setZoomLevel: (level) => set((state) => ({ 
    zoomLevel: Math.max(0.1, Math.min(level, 5.0)) // Mínimo 10%, Máximo 500%
  })),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setPdfFile: (file) => set({ pdfFile: file }),
}));