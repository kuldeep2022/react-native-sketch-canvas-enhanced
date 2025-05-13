'use strict';

import memoize from 'memoize-one';
import React from 'react';
import ReactNative, {
  requireNativeComponent,
  NativeModules,
  UIManager,
  PanResponder,
  PixelRatio,
  Platform,
  processColor,
} from 'react-native';
import {requestPermissions} from './handlePermissions';
import type {
  SketchCanvasProps,
  CanvasText,
  PathData,
  Path,
  Shape,
  ShapeData,
  ShapeType,
} from './types';

const SketchViewName = 'RNSketchCanvas';
const RNSketchCanvas = requireNativeComponent(
  SketchViewName,
) as unknown as string;
const SketchCanvasManager = NativeModules.RNSketchCanvasManager || {};

type CanvasState = {
  text: any;
  currentShape: Shape | null;
  isDrawingShape: boolean;
  selectedTextId: number | null;
};

interface SketchCanvasPropsWithTextMode extends SketchCanvasProps {
  pendingTextMode?: boolean;
  onTextPlaced?: (position: { x: number; y: number }) => void;
}

class SketchCanvas extends React.Component<SketchCanvasPropsWithTextMode, CanvasState> {
  static defaultProps = {
    style: null,
    strokeColor: '#000000',
    strokeWidth: 3,
    onPathsChange: () => {},
    onStrokeStart: (_x: number, _y: number) => {},
    onStrokeChanged: () => {},
    onStrokeEnd: () => {},
    onShapeStart: (_x: number, _y: number) => {},
    onShapeChanged: () => {},
    onShapeEnd: () => {},
    onTextTapped: () => {},
    onTextEditingComplete: () => {},
    onSketchSaved: () => {},
    onShapesChange: () => {},
    user: null,

    touchEnabled: true,
    drawMode: 'draw',
    shapeFilled: false,
    shapes: [],

    text: null,
    localSourceImage: null,

    permissionDialogTitle: '',
    permissionDialogMessage: '',
  };

  _pathsToProcess: Path[];
  _paths: Path[];
  _path: PathData | null;
  _shapesToProcess: Shape[];
  _shapes: Shape[];
  _currentShape: ShapeData | null;
  _handle: any;
  _screenScale: number;
  _offset: {x: number; y: number};
  _size: {width: number; height: number};
  _initialized: boolean;
  panResponder: any;

  state = {
    text: null,
    currentShape: null,
    isDrawingShape: false,
    selectedTextId: null,
  };
  static MAIN_BUNDLE: any;
  static DOCUMENT: any;
  static LIBRARY: any;
  static CACHES: any;

  constructor(props: SketchCanvasProps) {
    super(props);
    this._pathsToProcess = [];
    this._paths = [];
    this._path = null;
    this._shapesToProcess = [];
    this._shapes = props.shapes ? [...props.shapes] : [];
    this._currentShape = null;
    this._handle = null;
    this._screenScale = Platform.OS === 'ios' ? 1 : PixelRatio.get();
    this._offset = {x: 0, y: 0};
    this._size = {width: 0, height: 0};
    this._initialized = false;

    this.panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (_evt, _gestureState) => true,
      onStartShouldSetPanResponderCapture: (_evt, _gestureState) => true,
      onMoveShouldSetPanResponder: (_evt, _gestureState) => true,
      onMoveShouldSetPanResponderCapture: (_evt, _gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        // If pendingTextMode is enabled, add text at tap location and exit
        if (this.props.pendingTextMode && this.props.onTextPlaced) {
          const e = evt.nativeEvent;
          const x = e.locationX;
          const y = e.locationY;
          this.props.onTextPlaced({ x, y });
          return;
        }
        if (!this.props.touchEnabled) {
          return;
        }

        // Check if we're tapping on a text element
        if (this.props.text && this.props.text.length > 0) {
          const e = evt.nativeEvent;
          const x = e.locationX;
          const y = e.locationY;

          // Check if tap is on a text element
          const tappedTextId = this.checkTextTap(x, y);
          if (tappedTextId !== null) {
            this.setState({selectedTextId: tappedTextId});
            this.props.onTextTapped?.(tappedTextId);
            return;
          }
        }

        // If draw mode is 'none', don't draw anything
        if (this.props.drawMode === 'none') {
          return;
        }

        const e = evt.nativeEvent;
        this._offset = {x: e.pageX - e.locationX, y: e.pageY - e.locationY};

        const x = parseFloat((gestureState.x0 - this._offset.x).toFixed(2));
        const y = parseFloat((gestureState.y0 - this._offset.y).toFixed(2));

        // Handle different drawing modes
        if (this.props.drawMode === 'draw') {
          // Regular drawing mode
          this._path = {
            id: parseInt(String(Math.random() * 100000000), 10),
            color: this.props.strokeColor,
            width: this.props.strokeWidth,
            data: [],
          };

          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.newPath!,
            [
              this._path.id,
              processColor(this._path.color),
              this._path.width ? this._path.width * this._screenScale : 0,
            ],
          );

          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPoint!,
            [
              parseFloat(
                (
                  Number((gestureState.x0 - this._offset.x).toFixed(2)) *
                  this._screenScale
                ).toString(),
              ),
              parseFloat(
                (
                  Number((gestureState.y0 - this._offset.y).toFixed(2)) *
                  this._screenScale
                ).toString(),
              ),
            ],
          );

          this._path.data.push(`${x},${y}`);
          this.props.onStrokeStart?.(x, y);
        } else if (
          ['line', 'rectangle', 'circle', 'arrow'].includes(
            this.props.drawMode || '',
          )
        ) {
          // Shape drawing mode - only for valid shape types
          this._currentShape = {
            id: parseInt(String(Math.random() * 100000000), 10),
            type: this.props.drawMode as ShapeType,
            color: this.props.strokeColor,
            width: this.props.strokeWidth,
            filled: this.props.shapeFilled,
            startPoint: {x, y},
            endPoint: {x, y},
          };

          this.setState({
            isDrawingShape: true,
            currentShape: {
              shape: this._currentShape,
              size: this._size,
              drawer: this.props.user,
            },
          });

          this.props.onShapeStart?.(x, y);

          // Start drawing the shape on the canvas
          this.drawShapeOnCanvas(this._currentShape);
        }
        // If it's not 'draw' or a valid shape type, do nothing
      },

      onPanResponderMove: (_evt, gestureState) => {
        if (!this.props.touchEnabled) {
          return;
        }

        // If draw mode is 'none', don't draw anything
        if (this.props.drawMode === 'none') {
          return;
        }

        const x = parseFloat((gestureState.moveX - this._offset.x).toFixed(2));
        const y = parseFloat((gestureState.moveY - this._offset.y).toFixed(2));

        if (this.props.drawMode === 'draw' && this._path) {
          // Regular drawing mode
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPoint!,
            [
              parseFloat(
                (
                  Number((gestureState.moveX - this._offset.x).toFixed(2)) *
                  this._screenScale
                ).toString(),
              ),
              parseFloat(
                (
                  Number((gestureState.moveY - this._offset.y).toFixed(2)) *
                  this._screenScale
                ).toString(),
              ),
            ],
          );

          this._path.data.push(`${x},${y}`);
          this.props.onStrokeChanged?.(x, y);
        } else if (
          this._currentShape &&
          this.state.isDrawingShape &&
          ['line', 'rectangle', 'circle', 'arrow'].includes(
            this.props.drawMode || '',
          )
        ) {
          // Shape drawing mode - update end point
          this._currentShape.endPoint = {x, y};

          // Update the shape on the canvas
          this.updateShapeOnCanvas(this._currentShape);

          const currentShape = {
            shape: this._currentShape,
            size: this._size,
            drawer: this.props.user,
          };

          this.setState({currentShape});
          this.props.onShapeChanged?.(currentShape);
        }
      },

      onPanResponderRelease: (_evt, _gestureState) => {
        if (!this.props.touchEnabled) {
          return;
        }

        // If draw mode is 'none', don't draw anything
        if (this.props.drawMode === 'none') {
          return;
        }

        if (this.props.drawMode === 'draw' && this._path) {
          // Regular drawing mode
          this.props.onStrokeEnd?.({
            path: this._path,
            size: this._size,
            drawer: this.props.user,
          });

          this._paths.push({
            path: this._path,
            size: this._size,
            drawer: this.props.user,
          });

          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.endPath!,
            [],
          );
        } else if (
          this._currentShape &&
          this.state.isDrawingShape &&
          ['line', 'rectangle', 'circle', 'arrow'].includes(
            this.props.drawMode || '',
          )
        ) {
          // Shape drawing mode - finalize the shape
          const shape = {
            shape: this._currentShape,
            size: this._size,
            drawer: this.props.user,
          };

          this._shapes.push(shape);
          this.props.onShapeEnd?.(shape);
          this.props.onShapesChange?.(this._shapes.length);

          // Finalize the shape on the canvas
          this.finalizeShapeOnCanvas(this._currentShape);

          this.setState({
            isDrawingShape: false,
            currentShape: null,
          });
        }
      },

      onShouldBlockNativeResponder: (_evt, _gestureState) => {
        return true;
      },
    });
  }

  _processText(text: any) {
    text &&
      text.forEach(
        (t: {fontColor: any}) => (t.fontColor = processColor(t.fontColor)),
      );
    return text;
  }

  getProcessedText = memoize((text: CanvasText[] | undefined) => {
    const textCopy = text ? text.map(t => Object.assign({}, t)) : null;

    return this._processText(textCopy);
  });

  clear() {
    this._paths = [];
    this._path = null;
    this._shapes = [];
    this._currentShape = null;
    this.setState({
      isDrawingShape: false,
      currentShape: null,
      selectedTextId: null,
    });
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.clear!,
      [],
    );
  }

  undo() {
    // First check if there's a shape to undo
    if (this._shapes.length > 0) {
      const lastShape = this._shapes.pop();
      if (lastShape) {
        UIManager.dispatchViewManagerCommand(
          this._handle,
          UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
          [lastShape.shape.id],
        );
        this.props.onShapesChange?.(this._shapes.length);
        return lastShape.shape.id;
      }
    }

    // If no shapes, undo a path
    let lastId = -1;
    this._paths.forEach(
      (d: any) => (lastId = d.drawer === this.props.user ? d.path.id : lastId),
    );
    if (lastId >= 0) {
      this.deletePath(lastId);
    }
    return lastId;
  }

  addPath(data: Path) {
    if (this._initialized) {
      if (
        this._paths.filter((p: Path) => p.path.id === data.path.id).length === 0
      ) {
        this._paths.push(data);
      }
      const pathData = data.path.data.map((p: any) => {
        const coor = p.split(',').map((pp: any) => parseFloat(pp).toFixed(2));
        return `${
          (coor[0] * this._screenScale * this._size.width) / data.size.width
        },${
          (coor[1] * this._screenScale * this._size.height) / data.size.height
        }`;
      });
      UIManager.dispatchViewManagerCommand(
        this._handle,
        UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPath!,
        [
          data.path.id,
          processColor(data.path.color),
          data.path.width ? data.path.width * this._screenScale : 0,
          pathData,
        ],
      );
    } else {
      this._pathsToProcess.filter((p: Path) => p.path.id === data.path.id)
        .length === 0 && this._pathsToProcess.push(data);
    }
  }

  deletePath(id: any) {
    this._paths = this._paths.filter(p => p.path.id !== id);
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
      [id],
    );
  }

  save(
    imageType: string,
    transparent: boolean,
    folder: string,
    filename: string,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean,
  ) {
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.save!,
      [
        imageType,
        folder,
        filename,
        transparent,
        includeImage,
        includeText,
        cropToImageSize,
      ],
    );
  }

  getPaths() {
    return this._paths;
  }

  getShapes() {
    return this._shapes;
  }

  getBase64(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean,
    callback: () => void,
  ) {
    if (Platform.OS === 'ios') {
      SketchCanvasManager.transferToBase64(
        this._handle,
        imageType,
        transparent,
        includeImage,
        includeText,
        cropToImageSize,
        callback,
      );
    } else {
      NativeModules.SketchCanvasModule.transferToBase64(
        this._handle,
        imageType,
        transparent,
        includeImage,
        includeText,
        cropToImageSize,
        callback,
      );
    }
  }

  /**
   * Check if a tap is on a text element
   */
  checkTextTap(x: number, y: number): number | null {
    if (!this.props.text || this.props.text.length === 0) {
      return null;
    }

    // Simple hit testing for text elements
    for (let i = 0; i < this.props.text.length; i++) {
      const textItem = this.props.text[i];
      if (!textItem) continue;

      // Calculate text bounds based on position and font size
      // This is a simplified approach - in a real implementation, you'd need more precise bounds
      const fontSize = textItem.fontSize || 12;
      const padding = textItem.padding || 0;
      const textWidth = textItem.text.length * (fontSize * 0.6); // Rough estimate of text width
      const textHeight = fontSize * 1.2; // Rough estimate of text height

      const textX = textItem.position.x;
      const textY = textItem.position.y;

      // Check if tap is within text bounds
      if (
        x >= textX - padding &&
        x <= textX + textWidth + padding &&
        y >= textY - padding &&
        y <= textY + textHeight + padding
      ) {
        return textItem.id || i;
      }
    }

    return null;
  }

  /**
   * Add a new text element to the canvas
   */
  addText(text: CanvasText) {
    // Ensure text has an ID
    const textWithId = {
      ...text,
      id: text.id || parseInt(String(Math.random() * 100000000), 10),
    };

    // Process the text for the native module
    const processedText = {
      ...textWithId,
      fontColor: processColor(textWithId.fontColor),
      backgroundColor: textWithId.backgroundColor
        ? processColor(textWithId.backgroundColor)
        : null,
      borderColor: textWithId.borderColor
        ? processColor(textWithId.borderColor)
        : null,
    };

    // Add text to the canvas via native module
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addText!,
      [processedText],
    );

    // Update our local state
    const updatedText = [...(this.props.text || []), textWithId];
    this.setState({text: updatedText});

    // Notify parent component
    if (this.props.onTextEditingComplete) {
      this.props.onTextEditingComplete(textWithId);
    }

    return textWithId.id;
  }

  /**
   * Update an existing text element
   */
  updateText(text: CanvasText) {
    if (!text.id) return;

    // Process the text for the native module
    const processedText = {
      ...text,
      fontColor: processColor(text.fontColor),
      backgroundColor: text.backgroundColor
        ? processColor(text.backgroundColor)
        : null,
      borderColor: text.borderColor ? processColor(text.borderColor) : null,
    };

    // Update text on the canvas via native module
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.updateText!,
      [processedText],
    );

    // Find and update the text element in our local state
    const updatedText = (this.props.text || []).map(t =>
      t.id === text.id ? text : t,
    );

    this.setState({text: updatedText});

    // Notify parent component
    if (this.props.onTextEditingComplete) {
      this.props.onTextEditingComplete(text);
    }
  }

  /**
   * Delete a text element by ID
   */
  deleteText(id: number) {
    // Delete text from the canvas via native module
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deleteText!,
      [id],
    );

    // Update our local state
    const updatedText = (this.props.text || []).filter(t => t.id !== id);
    this.setState({text: updatedText});
  }

  /**
   * Draw a shape on the canvas
   */
  drawShapeOnCanvas(shape: ShapeData) {

    // For other shapes, use the standard approach
    const pathData = this.shapeToPathData(shape);

    // Create a new path for the shape
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.newPath!,
      [
        shape.id,
        processColor(shape.color),
        shape.width ? shape.width * this._screenScale : 0,
      ],
    );

    // Add points to the path
    for (const point of pathData) {
      const [xRaw, yRaw] = point.split(',');
      const x = typeof xRaw !== 'undefined' ? parseFloat(xRaw) : undefined;
      const y = typeof yRaw !== 'undefined' ? parseFloat(yRaw) : undefined;
      if (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) {
        UIManager.dispatchViewManagerCommand(
          this._handle,
          UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPoint!,
          [
            parseFloat((x * this._screenScale).toString()),
            parseFloat((y * this._screenScale).toString()),
          ],
        );
      }
    }
  }

/**
 * Draw a rectangle with clean corners
 */
drawRectangle(shape: ShapeData) {
  const { startPoint, endPoint } = shape;

  // Use numeric offsets for unique IDs
  const topId = shape.id + 1000;
  const rightId = shape.id + 2000;
  const bottomId = shape.id + 3000;
  const leftId = shape.id + 4000;
  const fillId1 = shape.id + 5000;
  const fillId2 = shape.id + 6000;

  // Top edge
  this.drawLine(
    { ...shape, id: topId },
    { x: startPoint.x, y: startPoint.y },
    { x: endPoint.x, y: startPoint.y }
  );

  // Right edge
  this.drawLine(
    { ...shape, id: rightId },
    { x: endPoint.x, y: startPoint.y },
    { x: endPoint.x, y: endPoint.y }
  );

  // Bottom edge
  this.drawLine(
    { ...shape, id: bottomId },
    { x: endPoint.x, y: endPoint.y },
    { x: startPoint.x, y: endPoint.y }
  );

  // Left edge
  this.drawLine(
    { ...shape, id: leftId },
    { x: startPoint.x, y: endPoint.y },
    { x: startPoint.x, y: startPoint.y }
  );

  // Add diagonal fill lines if needed
  if (shape.filled) {
    this.drawLine(
      { ...shape, id: fillId1 },
      { x: startPoint.x, y: startPoint.y },
      { x: endPoint.x, y: endPoint.y }
    );

    this.drawLine(
      { ...shape, id: fillId2 },
      { x: endPoint.x, y: startPoint.y },
      { x: startPoint.x, y: endPoint.y }
    );
  }
}

/**
 * Helper to draw a single line between two points
 */
drawLine(shape: ShapeData, from: {x: number, y: number}, to: {x: number, y: number}) {
  // Create a new path for the line
  UIManager.dispatchViewManagerCommand(
    this._handle,
    UIManager.getViewManagerConfig(RNSketchCanvas).Commands.newPath!,
    [
      shape.id,
      processColor(shape.color),
      shape.width ? shape.width * this._screenScale : 0,
    ]
  );
  
  // Add the start point
  UIManager.dispatchViewManagerCommand(
    this._handle,
    UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPoint!,
    [
      parseFloat((from.x * this._screenScale).toString()),
      parseFloat((from.y * this._screenScale).toString()),
    ]
  );
  
  // Add the end point
  UIManager.dispatchViewManagerCommand(
    this._handle,
    UIManager.getViewManagerConfig(RNSketchCanvas).Commands.addPoint!,
    [
      parseFloat((to.x * this._screenScale).toString()),
      parseFloat((to.y * this._screenScale).toString()),
    ]
  );
  
  // End the path
  UIManager.dispatchViewManagerCommand(
    this._handle,
    UIManager.getViewManagerConfig(RNSketchCanvas).Commands.endPath!,
    []
  );
}

  /**
   * Update a shape on the canvas
   */
  updateShapeOnCanvas(shape: ShapeData) {
    // Delete all paths related to this shape
    if (shape.type === 'rectangle') {
      if (shape.filled) {
        // For filled rectangles, delete all the paths we created
        // Delete the outline sides
        for (let i = 0; i < 4; i++) {
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
            [shape.id + 'side' + i],
          );
        }

        // Delete the diagonal lines
        for (let i = 0; i < 2; i++) {
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
            [shape.id + 'diag' + i],
          );
        }

        // Delete the horizontal fill lines
        for (let i = 1; i <= 10; i++) {
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
            [shape.id + 'hline' + i],
          );
        }

        // Delete the vertical fill lines
        for (let i = 1; i <= 10; i++) {
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
            [shape.id + 'vline' + i],
          );
        }
      } else {
        // For unfilled rectangles, we need to delete all four sides
        for (let i = 0; i < 4; i++) {
          UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
            [shape.id + i],
          );
        }
      }
    } else {
      // For other shapes, just delete the main path
      UIManager.dispatchViewManagerCommand(
        this._handle,
        UIManager.getViewManagerConfig(RNSketchCanvas).Commands.deletePath!,
        [shape.id],
      );
    }

    // Redraw the shape
    this.drawShapeOnCanvas(shape);
  }

  /**
   * Finalize a shape on the canvas
   */
  finalizeShapeOnCanvas(shape: ShapeData) {
    // End the current path
    UIManager.dispatchViewManagerCommand(
      this._handle,
      UIManager.getViewManagerConfig(RNSketchCanvas).Commands.endPath!,
      [],
    );
  }

  /**
   * Convert a shape to path data points
   */
  shapeToPathData(shape: ShapeData): string[] {
    const {startPoint, endPoint, type} = shape;
    const pathData: string[] = [];

    switch (type) {
      case 'line':
        // Simple line from start to end
        pathData.push(`${startPoint.x},${startPoint.y}`);
        pathData.push(`${endPoint.x},${endPoint.y}`);
        break;

      case 'rectangle':
        const stepsPerSide = 9;

        const minX = Math.min(startPoint.x, endPoint.x);
        const maxX = Math.max(startPoint.x, endPoint.x);
        const minY = Math.min(startPoint.y, endPoint.y);
        const maxY = Math.max(startPoint.y, endPoint.y);

        // Top side
        for (let i = 0; i < stepsPerSide; i++) {
          const x = minX + ((maxX - minX) * i) / stepsPerSide;
          const y = minY;
          pathData.push(`${x},${y}`);
        }

        // Right side
        for (let i = 0; i < stepsPerSide; i++) {
          const x = maxX;
          const y = minY + ((maxY - minY) * i) / stepsPerSide;
          pathData.push(`${x},${y}`);
        }

        // Bottom side
        for (let i = 0; i < stepsPerSide; i++) {
          const x = maxX - ((maxX - minX) * i) / stepsPerSide;
          const y = maxY;
          pathData.push(`${x},${y}`);
        }

        // Left side
        for (let i = 0; i < stepsPerSide; i++) {
          const x = minX;
          const y = maxY - ((maxY - minY) * i) / stepsPerSide;
          pathData.push(`${x},${y}`);
        }

        // Close the shape
        pathData.push(`${minX},${minY}`);
        break;

      case 'circle':
        // Approximate a circle with points
        const centerX = (startPoint.x + endPoint.x) / 2;
        const centerY = (startPoint.y + endPoint.y) / 2;
        const radiusX = Math.abs(endPoint.x - startPoint.x) / 2;
        const radiusY = Math.abs(endPoint.y - startPoint.y) / 2;

        // Generate points around the ellipse
        const steps = 36; // Number of points to approximate the circle
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * 2 * Math.PI;
          const x = centerX + radiusX * Math.cos(angle);
          const y = centerY + radiusY * Math.sin(angle);
          pathData.push(`${x},${y}`);
        }

        // We're removing the fill functionality as requested
        // Even if filled is true, we won't add fill lines
        break;

      case 'arrow':
        // Line from start to end
        pathData.push(`${startPoint.x},${startPoint.y}`);
        pathData.push(`${endPoint.x},${endPoint.y}`);

        // Calculate arrow head
        const angle = Math.atan2(
          endPoint.y - startPoint.y,
          endPoint.x - startPoint.x,
        );
        const arrowLength = Math.min(
          20, // Max arrow head length
          Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
              Math.pow(endPoint.y - startPoint.y, 2),
          ) / 3, // Arrow head is 1/3 of the line length, but not more than 20px
        );

        // Arrow head left
        const arrowLeft = {
          x: endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
          y: endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6),
        };

        // Arrow head right
        const arrowRight = {
          x: endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
          y: endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6),
        };

        // Add arrow head to path
        pathData.push(`${endPoint.x},${endPoint.y}`);
        pathData.push(`${arrowLeft.x},${arrowLeft.y}`);
        pathData.push(`${endPoint.x},${endPoint.y}`);
        pathData.push(`${arrowRight.x},${arrowRight.y}`);
        break;

      case 'none':
        // No drawing for 'none' type
        break;
    }

    return pathData;
  }

  async componentDidMount() {
    await requestPermissions(
      this.props.permissionDialogTitle || '',
      this.props.permissionDialogMessage || '',
    );
  }

  render() {
    return (
      <RNSketchCanvas
        ref={(ref: any) => {
          this._handle = ReactNative.findNodeHandle(ref);
        }}
        style={this.props.style}
        onLayout={(e: any) => {
          this._size = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
          this._initialized = true;
          this._pathsToProcess.length > 0 &&
            this._pathsToProcess.forEach(p => this.addPath(p));
        }}
        {...this.panResponder.panHandlers}
        onChange={(e: any) => {
          if (e.nativeEvent.hasOwnProperty('pathsUpdate')) {
            this.props.onPathsChange?.(e.nativeEvent.pathsUpdate);
          } else if (
            e.nativeEvent.hasOwnProperty('success') &&
            e.nativeEvent.hasOwnProperty('path')
          ) {
            this.props.onSketchSaved?.(
              e.nativeEvent.success,
              e.nativeEvent.path,
            );
          } else if (e.nativeEvent.hasOwnProperty('success')) {
            this.props.onSketchSaved?.(e.nativeEvent.success, '');
          }
        }}
        localSourceImage={this.props.localSourceImage}
        permissionDialogTitle={this.props.permissionDialogTitle}
        permissionDialogMessage={this.props.permissionDialogMessage}
        text={this.getProcessedText(this.props.text)}
      />
    );
  }
}
const ViewManager = UIManager.getViewManagerConfig(RNSketchCanvas) as any;
SketchCanvas.MAIN_BUNDLE =
  Platform.OS === 'ios' ? ViewManager.Constants.MainBundlePath : '';
SketchCanvas.DOCUMENT =
  Platform.OS === 'ios' ? ViewManager.Constants.NSDocumentDirectory : '';
SketchCanvas.LIBRARY =
  Platform.OS === 'ios' ? ViewManager.Constants.NSLibraryDirectory : '';
SketchCanvas.CACHES =
  Platform.OS === 'ios' ? ViewManager.Constants.NSCachesDirectory : '';

export default SketchCanvas;
