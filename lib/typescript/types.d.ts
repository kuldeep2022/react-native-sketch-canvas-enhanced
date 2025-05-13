/// <reference types="react" />
import type { StyleProp, ViewStyle } from 'react-native';
export type ImageType = 'png' | 'jpg';
export type Size = {
    width: number;
    height: number;
};
export type ShapeType = 'line' | 'rectangle' | 'circle' | 'arrow' | 'none';
export type PathData = {
    id: number;
    color: string | undefined;
    width: number | undefined;
    data: string[];
};
export type ShapeData = {
    id: number;
    type: ShapeType;
    color: string | undefined;
    width: number | undefined;
    filled?: boolean;
    startPoint: {
        x: number;
        y: number;
    };
    endPoint: {
        x: number;
        y: number;
    };
};
export type Path = {
    drawer?: string;
    size: Size;
    path: PathData;
};
export type Shape = {
    drawer?: string;
    size: Size;
    shape: ShapeData;
};
export type CanvasText = {
    id?: number;
    text: string;
    font?: string;
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    overlay?: 'TextOnSketch' | 'SketchOnText';
    anchor?: {
        x: number;
        y: number;
    };
    position: {
        x: number;
        y: number;
    };
    coordinate?: 'Absolute' | 'Ratio';
    /**
     * If your text is multiline, `alignment` can align shorter lines with left/center/right.
     */
    alignment?: 'Left' | 'Center' | 'Right';
    /**
     * If your text is multiline, `lineHeightMultiple` can adjust the space between lines.
     */
    lineHeightMultiple?: number;
    /**
     * Text style options
     */
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecorationLine?: 'none' | 'underline' | 'line-through';
    /**
     * Border options for text box
     */
    borderWidth?: number;
    borderColor?: string;
    borderRadius?: number;
    /**
     * Padding inside text box
     */
    padding?: number;
    /**
     * Rotation angle in degrees
     */
    rotation?: number;
    /**
     * Editable flag to allow text editing
     */
    editable?: boolean;
};
export interface SavePreference {
    folder: string;
    filename: string;
    transparent: boolean;
    imageType: ImageType;
    includeImage?: boolean;
    includeText?: boolean;
    cropToImageSize?: boolean;
}
export interface LocalSourceImage {
    filename: string;
    directory?: string;
    mode?: 'AspectFill' | 'AspectFit' | 'ScaleToFill';
}
export interface SketchCanvasProps {
    style?: StyleProp<ViewStyle>;
    strokeColor?: string;
    strokeWidth?: number;
    user?: string;
    text?: CanvasText[];
    localSourceImage?: LocalSourceImage;
    touchEnabled?: boolean;
    /**
     * Drawing mode: 'draw' for freehand drawing, or a shape type
     */
    drawMode?: 'draw' | ShapeType;
    /**
     * For shape drawing: whether to fill shapes with color
     */
    shapeFilled?: boolean;
    /**
     * Shapes drawn on the canvas
     */
    shapes?: Shape[];
    /**
     * Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set
     */
    permissionDialogTitle?: string;
    /**
     * Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set
     */
    permissionDialogMessage?: string;
    onStrokeStart?: (x: number, y: number) => void;
    onStrokeChanged?: (x: number, y: number) => void;
    onStrokeEnd?: (path: Path) => void;
    onShapeStart?: (x: number, y: number) => void;
    onShapeChanged?: (shape: Shape) => void;
    onShapeEnd?: (shape: Shape) => void;
    onTextTapped?: (textId: number) => void;
    onTextEditingComplete?: (text: CanvasText) => void;
    onSketchSaved?: (result: boolean, path: string) => void;
    onPathsChange?: (pathsCount: number) => void;
    onShapesChange?: (shapesCount: number) => void;
}
export interface RNSketchCanvasProps {
    containerStyle?: StyleProp<ViewStyle>;
    canvasStyle?: StyleProp<ViewStyle>;
    onStrokeStart?: (x: number, y: number) => void;
    onStrokeChanged?: () => void;
    onStrokeEnd?: (path: Path) => void;
    onShapeStart?: (x: number, y: number) => void;
    onShapeChanged?: (shape: Shape) => void;
    onShapeEnd?: (shape: Shape) => void;
    onTextTapped?: (textId: number) => void;
    onTextEditingComplete?: (text: CanvasText) => void;
    onClosePressed?: () => void;
    onUndoPressed?: (id: number) => void;
    onClearPressed?: () => void;
    onPathsChange?: (pathsCount: number) => void;
    onShapesChange?: (shapesCount: number) => void;
    user?: string;
    closeComponent?: JSX.Element;
    eraseComponent?: JSX.Element;
    undoComponent?: JSX.Element;
    clearComponent?: JSX.Element;
    saveComponent?: JSX.Element;
    strokeComponent?: (color: string) => JSX.Element;
    strokeSelectedComponent?: (color: string, index: number, changed: boolean) => JSX.Element;
    strokeWidthComponent?: (width: number) => JSX.Element;
    lineComponent?: JSX.Element;
    rectangleComponent?: JSX.Element;
    circleComponent?: JSX.Element;
    arrowComponent?: JSX.Element;
    shapeFilledComponent?: JSX.Element;
    textComponent?: JSX.Element;
    textEditComponent?: (text: CanvasText) => JSX.Element;
    strokeColors?: {
        color: string;
    }[];
    defaultStrokeIndex?: number;
    defaultStrokeWidth?: number;
    minStrokeWidth?: number;
    maxStrokeWidth?: number;
    strokeWidthStep?: number;
    /**
     * Default drawing mode
     */
    defaultDrawMode?: 'draw' | ShapeType;
    /**
     * Default shape filled state
     */
    defaultShapeFilled?: boolean;
    alphlaValues: string[];
    /**
     * @param imageType "png" or "jpg"
     * @param includeImage default true
     * @param cropToImageSize default false
     */
    savePreference?: () => {
        folder: string;
        filename: string;
        transparent: boolean;
        imageType: ImageType;
        includeImage?: boolean;
        includeText?: boolean;
        cropToImageSize?: boolean;
    };
    onSketchSaved?: (result: boolean, path: string) => void;
    text?: CanvasText[];
    /**
     * {
     *    filename: string,
     *    directory: string,
     *    mode: 'AspectFill' | 'AspectFit' | 'ScaleToFill'
     * }
     */
    localSourceImage?: LocalSourceImage;
    /**
     * Android Only: Provide a Dialog Title for the Image Saving PermissionDialog. Defaults to empty string if not set
     */
    permissionDialogTitle?: string;
    /**
     * Android Only: Provide a Dialog Message for the Image Saving PermissionDialog. Defaults to empty string if not set
     */
    permissionDialogMessage?: string;
}
