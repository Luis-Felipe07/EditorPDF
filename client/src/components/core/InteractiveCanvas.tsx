import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { usePDFStore } from '../../store/usePDFStore';

export interface PDFTextBox {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

interface InteractiveCanvasProps {
  pageNumber: number;
  width: number;
  height: number;
  textBoxes: PDFTextBox[];
  onPdfTextEditRequest: (box: PDFTextBox) => void;
}

const scaleRestoredObjects = (
  canvas: fabric.Canvas,
  previousWidth: number,
  previousHeight: number,
  nextWidth: number,
  nextHeight: number
) => {
  if (!previousWidth || !previousHeight) return;

  const scaleX = nextWidth / previousWidth;
  const scaleY = nextHeight / previousHeight;

  canvas.getObjects().forEach((object) => {
    object.set({
      left: (object.left ?? 0) * scaleX,
      top: (object.top ?? 0) * scaleY,
      scaleX: (object.scaleX ?? 1) * scaleX,
      scaleY: (object.scaleY ?? 1) * scaleY,
    });
    object.setCoords();
  });
};

const findTextBoxAtPoint = (boxes: PDFTextBox[], x: number, y: number) => {
  const hitPadding = 4;

  return boxes
    .filter((box) => (
      x >= box.left - hitPadding &&
      x <= box.left + box.width + hitPadding &&
      y >= box.top - hitPadding &&
      y <= box.top + box.height + hitPadding
    ))
    .sort((a, b) => (a.width * a.height) - (b.width * b.height))[0];
};

export const InteractiveCanvas = ({
  pageNumber,
  width,
  height,
  textBoxes,
  onPdfTextEditRequest,
}: InteractiveCanvasProps) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const textBoxesRef = useRef<PDFTextBox[]>(textBoxes);
  const onPdfTextEditRequestRef = useRef(onPdfTextEditRequest);
  const activeTool = usePDFStore((state) => state.activeTool);
  const editColor = usePDFStore((state) => state.editColor);
  const strokeWidth = usePDFStore((state) => state.strokeWidth);
  const fontSize = usePDFStore((state) => state.fontSize);
  const setFabricCanvas = usePDFStore((state) => state.setFabricCanvas);
  const setPageCanvas = usePDFStore((state) => state.setPageCanvas);
  const savePageAnnotations = usePDFStore((state) => state.savePageAnnotations);

  useEffect(() => {
    textBoxesRef.current = textBoxes;
    onPdfTextEditRequestRef.current = onPdfTextEditRequest;
  }, [onPdfTextEditRequest, textBoxes]);

  useEffect(() => {
    if (!canvasEl.current || width <= 0 || height <= 0) return;

    const canvas = new fabric.Canvas(canvasEl.current, {
      height,
      width,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
    });

    const sourceFile = usePDFStore.getState().pdfFile;
    let isDisposed = false;
    let isDrawingRectangle = false;
    let rectangleStart = { x: 0, y: 0 };
    let rectangle: fabric.Rect | null = null;

    const saveCanvas = () => {
      if (isDisposed || usePDFStore.getState().pdfFile !== sourceFile) return;

      savePageAnnotations(
        pageNumber,
        canvas.toJSON() as Record<string, unknown>,
        canvas.getWidth(),
        canvas.getHeight()
      );
    };

    const bindPersistenceEvents = () => {
      canvas.on('object:added', saveCanvas);
      canvas.on('object:modified', saveCanvas);
      canvas.on('object:removed', saveCanvas);
      canvas.on('path:created', saveCanvas);
      canvas.on('text:changed', saveCanvas);
    };

    const setCurrentCanvas = () => {
      setFabricCanvas(canvas);
    };

    const addText = (event: fabric.TPointerEventInfo) => {
      const pointer = event.scenePoint;
      const text = new fabric.IText('Texto', {
        left: pointer.x,
        top: pointer.y,
        fill: usePDFStore.getState().editColor,
        fontFamily: 'Arial',
        fontSize: usePDFStore.getState().fontSize,
        padding: 4,
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      canvas.requestRenderAll();
      saveCanvas();
    };

    const eraseObject = (event: fabric.TPointerEventInfo) => {
      const target = event.target;

      if (target) {
        canvas.remove(target);
        canvas.discardActiveObject();
        saveCanvas();
        return;
      }

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 0) {
        activeObjects.forEach((object) => canvas.remove(object));
        canvas.discardActiveObject();
        saveCanvas();
      }
    };

    const handleMouseDown = (event: fabric.TPointerEventInfo) => {
      setCurrentCanvas();

      const tool = usePDFStore.getState().activeTool;
      if (tool === 'text') {
        addText(event);
        return;
      }

      if (tool === 'eraser') {
        eraseObject(event);
        return;
      }

      if (tool === 'rectangle') {
        const pointer = event.scenePoint;
        isDrawingRectangle = true;
        rectangleStart = { x: pointer.x, y: pointer.y };
        rectangle = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'rgba(0, 0, 0, 0)',
          stroke: usePDFStore.getState().editColor,
          strokeWidth: usePDFStore.getState().strokeWidth,
          selectable: false,
          objectCaching: false,
        });

        canvas.add(rectangle);
      }
    };

    const handleMouseMove = (event: fabric.TPointerEventInfo) => {
      if (!isDrawingRectangle || !rectangle) return;

      const pointer = event.scenePoint;
      const left = Math.min(pointer.x, rectangleStart.x);
      const top = Math.min(pointer.y, rectangleStart.y);
      const rectWidth = Math.abs(pointer.x - rectangleStart.x);
      const rectHeight = Math.abs(pointer.y - rectangleStart.y);

      rectangle.set({
        left,
        top,
        width: rectWidth,
        height: rectHeight,
      });
      rectangle.setCoords();
      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingRectangle || !rectangle) return;

      isDrawingRectangle = false;

      if ((rectangle.width ?? 0) < 4 || (rectangle.height ?? 0) < 4) {
        canvas.remove(rectangle);
      } else {
        rectangle.set({ selectable: usePDFStore.getState().activeTool === 'select' });
        rectangle.setCoords();
      }

      rectangle = null;
      saveCanvas();
    };

    const handleDoubleClick = (event: fabric.TPointerEventInfo) => {
      const tool = usePDFStore.getState().activeTool;

      if (event.target || tool === 'draw' || tool === 'rectangle') {
        return;
      }

      const match = findTextBoxAtPoint(textBoxesRef.current, event.scenePoint.x, event.scenePoint.y);

      if (match) {
        setCurrentCanvas();
        onPdfTextEditRequestRef.current(match);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (usePDFStore.getState().fabricCanvas !== canvas) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      const activeObject = canvas.getActiveObject();
      if (activeObject instanceof fabric.IText && activeObject.isEditing) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length === 0) return;

      event.preventDefault();
      activeObjects.forEach((object) => canvas.remove(object));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      saveCanvas();
    };

    const restoreCanvas = async () => {
      const savedAnnotations = usePDFStore.getState().annotationsByPage[pageNumber];

      if (savedAnnotations) {
        await canvas.loadFromJSON(savedAnnotations.json);
        if (isDisposed) return;
        scaleRestoredObjects(canvas, savedAnnotations.width, savedAnnotations.height, width, height);
        canvas.requestRenderAll();
      }

      if (!isDisposed) {
        bindPersistenceEvents();
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);
    canvas.on('selection:created', setCurrentCanvas);
    canvas.on('selection:updated', setCurrentCanvas);
    window.addEventListener('keydown', handleKeyDown);

    fabricRef.current = canvas;
    setPageCanvas(pageNumber, canvas);
    void restoreCanvas();

    return () => {
      saveCanvas();
      isDisposed = true;
      canvas.off('object:added', saveCanvas);
      canvas.off('object:modified', saveCanvas);
      canvas.off('object:removed', saveCanvas);
      canvas.off('path:created', saveCanvas);
      canvas.off('text:changed', saveCanvas);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:dblclick', handleDoubleClick);
      canvas.off('selection:created', setCurrentCanvas);
      canvas.off('selection:updated', setCurrentCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      setPageCanvas(pageNumber, null);
      if (usePDFStore.getState().fabricCanvas === canvas) {
        setFabricCanvas(null);
      }
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [height, pageNumber, savePageAnnotations, setFabricCanvas, setPageCanvas, width]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const selectionEnabled = activeTool === 'select';
    const eraserEnabled = activeTool === 'eraser';

    canvas.isDrawingMode = activeTool === 'draw';
    canvas.selection = selectionEnabled;
    canvas.skipTargetFind = activeTool === 'draw' || activeTool === 'hand' || activeTool === 'text' || activeTool === 'rectangle';
    canvas.defaultCursor = activeTool === 'hand' ? 'grab' : activeTool === 'eraser' ? 'not-allowed' : 'crosshair';
    canvas.hoverCursor = eraserEnabled ? 'not-allowed' : 'move';

    canvas.getObjects().forEach((object) => {
      object.selectable = selectionEnabled || eraserEnabled;
      object.evented = selectionEnabled || eraserEnabled;
    });

    if (activeTool === 'draw') {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = strokeWidth;
      brush.color = editColor;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();
  }, [activeTool, editColor, strokeWidth]);

  useEffect(() => {
    const activeObject = fabricRef.current?.getActiveObject();

    if (activeObject instanceof fabric.IText && !activeObject.isEditing) {
      activeObject.set({
        fill: editColor,
        fontSize,
      });
      fabricRef.current?.requestRenderAll();
    }
  }, [editColor, fontSize]);

  return (
    <div className="absolute top-0 left-0 z-10">
      <canvas ref={canvasEl} />
    </div>
  );
};
