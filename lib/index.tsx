import React from 'react';
import {View, TouchableOpacity, FlatList, TextInput, Modal, Text} from 'react-native';
import SketchCanvas from './SketchCanvas';
import type {RNSketchCanvasProps, PathData, CanvasText, ShapeType} from './types';

type CanvasState = {
  color: any;
  strokeWidth: any;
  alpha: string;
  drawMode: 'draw' | ShapeType;
  shapeFilled: boolean;
  textEditing: boolean;
  currentText: CanvasText | null;
  pendingTextMode: boolean;
};

function generateUniqueFilename() {
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function (c) {
      // eslint-disable-next-line no-bitwise
      var r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      // eslint-disable-next-line no-bitwise
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    },
  );
  return uuid;
}

export default class RNSketchCanvas extends React.Component<
  RNSketchCanvasProps,
  CanvasState
> {
  static defaultProps = {
    containerStyle: null,
    canvasStyle: null,
    onStrokeStart: () => {},
    onStrokeChanged: () => {},
    onStrokeEnd: () => {},
    onShapeStart: () => {},
    onShapeChanged: () => {},
    onShapeEnd: () => {},
    onTextTapped: () => {},
    onTextEditingComplete: () => {},
    onClosePressed: () => {},
    onUndoPressed: () => {},
    onClearPressed: () => {},
    onPathsChange: () => {},
    onShapesChange: () => {},
    user: null,

    closeComponent: null,
    eraseComponent: null,
    undoComponent: null,
    clearComponent: null,
    saveComponent: null,
    strokeComponent: null,
    strokeSelectedComponent: null,
    strokeWidthComponent: null,
    
    // Shape drawing components
    lineComponent: null,
    rectangleComponent: null,
    circleComponent: null,
    arrowComponent: null,
    shapeFilledComponent: null,
    
    // Text annotation components
    textComponent: null,
    textEditComponent: null,

    strokeColors: [
      {color: '#000000'},
      {color: '#FF0000'},
      {color: '#00FFFF'},
      {color: '#0000FF'},
      {color: '#0000A0'},
      {color: '#ADD8E6'},
      {color: '#800080'},
      {color: '#FFFF00'},
      {color: '#00FF00'},
      {color: '#FF00FF'},
      {color: '#FFFFFF'},
      {color: '#C0C0C0'},
      {color: '#808080'},
      {color: '#FFA500'},
      {color: '#A52A2A'},
      {color: '#800000'},
      {color: '#008000'},
      {color: '#808000'},
    ],
    alphlaValues: ['33', '77', 'AA', 'FF'],
    defaultStrokeIndex: 0,
    defaultStrokeWidth: 3,

    minStrokeWidth: 3,
    maxStrokeWidth: 15,
    strokeWidthStep: 3,
    
    defaultDrawMode: 'draw',
    defaultShapeFilled: false,

    savePreference: null,
    onSketchSaved: () => {},

    text: null,
    localSourceImage: null,

    permissionDialogTitle: '',
    permissionDialogMessage: '',
  };

  _colorChanged: boolean;
  _strokeWidthStep: any;
  _alphaStep: any;
  _sketchCanvas: any;
  static MAIN_BUNDLE: any;
  static DOCUMENT: any;
  static LIBRARY: any;
  static CACHES: any;

  constructor(props: RNSketchCanvasProps) {
    super(props);

    this.state = {
      color: props.strokeColors?.[props?.defaultStrokeIndex || 0]?.color,
      strokeWidth: props.defaultStrokeWidth,
      alpha: 'FF',
      drawMode: props.defaultDrawMode || 'draw',
      shapeFilled: props.defaultShapeFilled || false,
      textEditing: false,
      currentText: null,
      pendingTextMode: false,
    };

    this._colorChanged = false;
    this._strokeWidthStep = props.strokeWidthStep;
    this._alphaStep = -1;
  }

  clear() {
    this._sketchCanvas.clear();
  }

  undo() {
    return this._sketchCanvas.undo();
  }

  addPath(data: PathData) {
    this._sketchCanvas.addPath(data);
  }

  deletePath(id: any) {
    this._sketchCanvas.deletePath(id);
  }

  save() {
    if (this.props.savePreference) {
      const p = this.props.savePreference();
      this._sketchCanvas.save(
        p.imageType,
        p.transparent,
        p.folder ? p.folder : '',
        p.filename,
        p.includeImage !== false,
        p.includeText !== false,
        p.cropToImageSize || false,
      );
    } else {
      this._sketchCanvas.save(
        'png',
        false,
        '',
        generateUniqueFilename(),
        true,
        true,
        false,
      );
    }
  }

  getBase64(
    imageType: string,
    transparent: boolean,
    includeImage: boolean,
    includeText: boolean,
    cropToImageSize: boolean,
    callback: () => void,
  ) {
    return this._sketchCanvas.getBase64(
      imageType,
      transparent,
      includeImage,
      includeText,
      cropToImageSize,
      callback,
    );
  }

  nextStrokeWidth() {
    if (
      (this.state.strokeWidth >= (this.props.maxStrokeWidth || 0) &&
        this._strokeWidthStep > 0) ||
      (this.state.strokeWidth <= (this.props.minStrokeWidth || 0) &&
        this._strokeWidthStep < 0)
    ) {
      this._strokeWidthStep = -this._strokeWidthStep;
    }
    this.setState({
      strokeWidth: this.state.strokeWidth + this._strokeWidthStep,
    });
  }

  _renderItem = ({item, index}: {item: any; index: any}) => (
    <TouchableOpacity
      style={{marginHorizontal: 2.5}}
      onPress={() => {
        if (this.state.color === item.color) {
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const index = this.props.alphlaValues.indexOf(this.state.alpha);
          if (this._alphaStep < 0) {
            this._alphaStep = index === 0 ? 1 : -1;
            this.setState({
              alpha: this.props.alphlaValues[index + this._alphaStep]!,
            });
          } else {
            this._alphaStep =
              index === this.props.alphlaValues.length - 1 ? -1 : 1;
            this.setState({
              alpha: this.props.alphlaValues[index + this._alphaStep]!,
            });
          }
        } else {
          this.setState({color: item.color});
          this._colorChanged = true;
        }
      }}>
      {this.state.color !== item.color &&
        this.props.strokeComponent &&
        this.props.strokeComponent(item.color)}
      {this.state.color === item.color &&
        this.props.strokeSelectedComponent &&
        this.props.strokeSelectedComponent(
          item.color + this.state.alpha,
          index,
          this._colorChanged,
        )}
    </TouchableOpacity>
  );

  componentDidUpdate() {
    this._colorChanged = false;
  }

  // Add text annotation at the current position
  addText(position: {x: number; y: number}) {
    const newText: CanvasText = {
      id: parseInt(String(Math.random() * 100000000), 10),
      text: 'New Text',
      fontSize: 20,
      fontColor: this.state.color + (this.state.color.length === 9 ? '' : this.state.alpha),
      position: position,
      coordinate: 'Absolute',
      alignment: 'Left',
      editable: true,
    };
    
    this.setState({
      textEditing: true,
      currentText: newText,
    });
    
    return newText.id;
  }
  
  // Set the drawing mode
  setDrawMode(mode: 'draw' | ShapeType) {
    this.setState({ drawMode: mode });
  }
  
  // Toggle shape filled state
  toggleShapeFilled() {
    this.setState(prevState => ({ shapeFilled: !prevState.shapeFilled }));
  }
  
  // Handle text editing completion
  handleTextEditingComplete(text: CanvasText) {
    this.setState({
      textEditing: false,
      currentText: null,
    });
    
    this.props.onTextEditingComplete?.(text);
  }

  render() {
    return (
      <View style={this.props.containerStyle}>
        {/* Top toolbar */}
        <View style={{flexDirection: 'row'}}>
          <View
            style={{
              flexDirection: 'row',
              flex: 1,
              justifyContent: 'flex-start',
            }}>
            {this.props.closeComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.props.onClosePressed?.();
                }}>
                {this.props.closeComponent}
              </TouchableOpacity>
            )}

            {this.props.eraseComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.setState({color: '#00000000', drawMode: 'draw'});
                }}>
                {this.props.eraseComponent}
              </TouchableOpacity>
            )}
            
            {/* Drawing mode buttons */}
            {this.props.lineComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.setDrawMode('line');
                }}
                style={{
                  opacity: this.state.drawMode === 'line' ? 1 : 0.6,
                }}>
                {this.props.lineComponent}
              </TouchableOpacity>
            )}
            
            {this.props.rectangleComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.setDrawMode('rectangle');
                }}
                style={{
                  opacity: this.state.drawMode === 'rectangle' ? 1 : 0.6,
                }}>
                {this.props.rectangleComponent}
              </TouchableOpacity>
            )}
            
            {this.props.circleComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.setDrawMode('circle');
                }}
                style={{
                  opacity: this.state.drawMode === 'circle' ? 1 : 0.6,
                }}>
                {this.props.circleComponent}
              </TouchableOpacity>
            )}
            
            {this.props.arrowComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.setDrawMode('arrow');
                }}
                style={{
                  opacity: this.state.drawMode === 'arrow' ? 1 : 0.6,
                }}>
                {this.props.arrowComponent}
              </TouchableOpacity>
            )}
            
            {/* Shape filled toggle */}
            {this.props.shapeFilledComponent && 
             (this.state.drawMode === 'rectangle' || this.state.drawMode === 'circle') && (
              <TouchableOpacity
                onPress={() => {
                  this.toggleShapeFilled();
                }}
                style={{
                  opacity: this.state.shapeFilled ? 1 : 0.6,
                }}>
                {this.props.shapeFilledComponent}
              </TouchableOpacity>
            )}
            
            {/* Text tool */}
            {this.props.textComponent && (
              <TouchableOpacity
                onPress={() => {
                  // Enable pending text mode: next tap on canvas will add text at that location
                  this.setState({ pendingTextMode: true });
                }}>
                {this.props.textComponent}
              </TouchableOpacity>
            )}
          </View>
          
          <View
            style={{flexDirection: 'row', flex: 1, justifyContent: 'flex-end'}}>
            {this.props.strokeWidthComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.nextStrokeWidth();
                }}>
                {this.props.strokeWidthComponent(this.state.strokeWidth)}
              </TouchableOpacity>
            )}

            {this.props.undoComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.props.onUndoPressed?.(this.undo());
                }}>
                {this.props.undoComponent}
              </TouchableOpacity>
            )}

            {this.props.clearComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.clear();
                  this.props.onClearPressed?.();
                }}>
                {this.props.clearComponent}
              </TouchableOpacity>
            )}

            {this.props.saveComponent && (
              <TouchableOpacity
                onPress={() => {
                  this.save();
                }}>
                {this.props.saveComponent}
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Canvas */}
        <SketchCanvas
          ref={ref => (this._sketchCanvas = ref)}
          style={this.props.canvasStyle}
          strokeColor={
            this.state.color +
            (this.state.color.length === 9 ? '' : this.state.alpha)
          }
          drawMode={this.state.drawMode}
          shapeFilled={this.state.shapeFilled}
          onStrokeStart={this.props.onStrokeStart}
          onStrokeChanged={this.props.onStrokeChanged}
          onStrokeEnd={this.props.onStrokeEnd}
          onShapeStart={this.props.onShapeStart}
          onShapeChanged={this.props.onShapeChanged}
          onShapeEnd={this.props.onShapeEnd}
          onTextTapped={(textId) => {
            // Find the text by ID
            const text = this.props.text?.find(t => t.id === textId);
            if (text) {
              this.setState({
                textEditing: true,
                currentText: text,
              });
            }
            this.props.onTextTapped?.(textId);
          }}
          pendingTextMode={this.state.pendingTextMode}
          onTextPlaced={position => {
            this.addText(position);
            this.setState({ pendingTextMode: false });
          }}
          user={this.props.user}
          strokeWidth={this.state.strokeWidth}
          onSketchSaved={(success, path) =>
            this.props.onSketchSaved?.(success, path)
          }
          onPathsChange={this.props.onPathsChange}
          onShapesChange={this.props.onShapesChange}
          text={this.props.text}
          localSourceImage={this.props.localSourceImage}
          permissionDialogTitle={this.props.permissionDialogTitle}
          permissionDialogMessage={this.props.permissionDialogMessage}
        />
        
        {/* Color picker */}
        <View style={{flexDirection: 'row'}}>
          <FlatList
            data={this.props.strokeColors}
            extraData={this.state}
            keyExtractor={() => Math.ceil(Math.random() * 10000000).toString()}
            renderItem={this._renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
        
        {/* Text editing modal */}
        {this.state.textEditing && this.state.currentText && (
          <Modal
            transparent
            animationType="fade"
            visible={this.state.textEditing}
            onRequestClose={() => {
              this.setState({ textEditing: false, currentText: null });
            }}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <View style={{
                width: '80%',
                backgroundColor: 'white',
                borderRadius: 10,
                padding: 20,
              }}>
                {this.props.textEditComponent ? (
                  this.props.textEditComponent(this.state.currentText)
                ) : (
                  <View>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#ccc',
                        borderRadius: 5,
                        padding: 10,
                        marginBottom: 10,
                        fontSize: 16,
                      }}
                      multiline
                      value={this.state.currentText.text}
                      onChangeText={(text) => {
                        this.setState({
                          currentText: {
                            ...this.state.currentText!,
                            text,
                          },
                        });
                      }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#ccc',
                          padding: 10,
                          borderRadius: 5,
                        }}
                        onPress={() => {
                          this.setState({ textEditing: false, currentText: null });
                        }}>
                        <View>
                          <Text>Cancel</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#007AFF',
                          padding: 10,
                          borderRadius: 5,
                        }}
                        onPress={() => {
                          this.handleTextEditingComplete(this.state.currentText!);
                        }}>
                        <View>
                          <Text style={{ color: 'white' }}>Done</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }
}

RNSketchCanvas.MAIN_BUNDLE = SketchCanvas.MAIN_BUNDLE;
RNSketchCanvas.DOCUMENT = SketchCanvas.DOCUMENT;
RNSketchCanvas.LIBRARY = SketchCanvas.LIBRARY;
RNSketchCanvas.CACHES = SketchCanvas.CACHES;

export { SketchCanvas };
export * from './types';
