import React from 'react';
import type { SketchCanvasProps, CanvasText, PathData, Path, Shape, ShapeData } from './types';
type CanvasState = {
    text: any;
    currentShape: Shape | null;
    isDrawingShape: boolean;
    selectedTextId: number | null;
};
interface SketchCanvasPropsWithTextMode extends SketchCanvasProps {
    pendingTextMode?: boolean;
    onTextPlaced?: (position: {
        x: number;
        y: number;
    }) => void;
}
declare class SketchCanvas extends React.Component<SketchCanvasPropsWithTextMode, CanvasState> {
    static defaultProps: {
        style: null;
        strokeColor: string;
        strokeWidth: number;
        onPathsChange: () => void;
        onStrokeStart: (_x: number, _y: number) => void;
        onStrokeChanged: () => void;
        onStrokeEnd: () => void;
        onShapeStart: (_x: number, _y: number) => void;
        onShapeChanged: () => void;
        onShapeEnd: () => void;
        onTextTapped: () => void;
        onTextEditingComplete: () => void;
        onSketchSaved: () => void;
        onShapesChange: () => void;
        user: null;
        touchEnabled: boolean;
        drawMode: string;
        shapeFilled: boolean;
        shapes: never[];
        text: null;
        localSourceImage: null;
        permissionDialogTitle: string;
        permissionDialogMessage: string;
    };
    _pathsToProcess: Path[];
    _paths: Path[];
    _path: PathData | null;
    _shapesToProcess: Shape[];
    _shapes: Shape[];
    _currentShape: ShapeData | null;
    _handle: any;
    _screenScale: number;
    _offset: {
        x: number;
        y: number;
    };
    _size: {
        width: number;
        height: number;
    };
    _initialized: boolean;
    panResponder: any;
    state: {
        text: null;
        currentShape: null;
        isDrawingShape: boolean;
        selectedTextId: null;
    };
    static MAIN_BUNDLE: any;
    static DOCUMENT: any;
    static LIBRARY: any;
    static CACHES: any;
    constructor(props: SketchCanvasProps);
    _processText(text: any): any;
    getProcessedText: (text: CanvasText[] | undefined) => any;
    clear(): void;
    undo(): number;
    addPath(data: Path): void;
    deletePath(id: any): void;
    save(imageType: string, transparent: boolean, folder: string, filename: string, includeImage: boolean, includeText: boolean, cropToImageSize: boolean): void;
    getPaths(): Path[];
    getShapes(): Shape[];
    getBase64(imageType: string, transparent: boolean, includeImage: boolean, includeText: boolean, cropToImageSize: boolean, callback: () => void): void;
    /**
     * Check if a tap is on a text element
     */
    checkTextTap(x: number, y: number): number | null;
    /**
     * Add a new text element to the canvas
     */
    addText(text: CanvasText): number;
    /**
     * Update an existing text element
     */
    updateText(text: CanvasText): void;
    /**
     * Delete a text element by ID
     */
    deleteText(id: number): void;
    /**
     * Draw a shape on the canvas
     */
    drawShapeOnCanvas(shape: ShapeData): void;
    /**
     * Draw a rectangle with clean corners
     */
    drawRectangle(shape: ShapeData): void;
    /**
     * Helper to draw a single line between two points
     */
    drawLine(shape: ShapeData, from: {
        x: number;
        y: number;
    }, to: {
        x: number;
        y: number;
    }): void;
    /**
     * Update a shape on the canvas
     */
    updateShapeOnCanvas(shape: ShapeData): void;
    /**
     * Finalize a shape on the canvas
     */
    finalizeShapeOnCanvas(shape: ShapeData): void;
    /**
     * Convert a shape to path data points
     */
    shapeToPathData(shape: ShapeData): string[];
    componentDidMount(): Promise<void>;
    render(): React.JSX.Element;
}
export default SketchCanvas;
