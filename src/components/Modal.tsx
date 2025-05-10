import * as React from 'react'
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  Dimensions,
} from 'react-native'
import { BorderRadiusObject, IStep, Labels, ValueXY } from '../types'
import styles, { MARGIN } from './style'
import { SvgMask } from './SvgMask'
import { Tooltip, TooltipProps } from './Tooltip'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

declare var __TEST__: boolean


export interface ModalProps {
  ref: any
  currentStep?: IStep
  visible?: boolean
  isFirstStep: boolean
  isLastStep: boolean
  animationDuration?: number
  tooltipComponent: React.ComponentType<TooltipProps>
  tooltipStyle?: StyleProp<ViewStyle>
  maskOffset?: number
  borderRadius?: number
  borderRadiusObject?: BorderRadiusObject
  androidStatusBarVisible: boolean
  backdropColor: string
  labels: Labels
  dismissOnPress?: boolean
  easing: (value: number) => number
  stop: () => void
  next: () => void
  prev: () => void
  preventOutsideInteraction?: boolean
  safeAreaInsets: { top: number; bottom: number }
}

interface Layout {
  x?: number
  y?: number
  width?: number
  height?: number
}

interface State {
  isFirstStep: boolean
  isLastStep: boolean
  tooltip: object
  notAnimated?: boolean
  containerVisible: boolean
  layout?: Layout
  size?: ValueXY
  position?: ValueXY
  tooltipTranslateY: Animated.Value
  opacity: Animated.Value
  currentStep?: IStep
  tooltipHeight?: number
}

interface Move {
  top: number
  left: number
  width: number
  height: number
}

export class Modal extends React.Component<ModalProps, State> {
  static defaultProps = {
    easing: Easing.elastic(0.7),
    animationDuration: 400,
    tooltipComponent: Tooltip as any,
    tooltipStyle: {},
    androidStatusBarVisible: false,
    backdropColor: 'rgba(0, 0, 0, 0.4)',
    labels: {},
    isHorizontal: false,
    preventOutsideInteraction: false,
  }

  layout?: Layout = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }

  state = {
    isFirstStep: false,
    isLastStep: false,
    tooltip: {},
    containerVisible: false,
    tooltipTranslateY: new Animated.Value(400),
    opacity: new Animated.Value(0),
    layout: undefined,
    size: undefined,
    position: undefined,
    currentStep: undefined,
    tooltipHeight: undefined,
  }

  dimensionsListener: any
  resizeKey: number = 0

  constructor(props: ModalProps) {
    super(props)
    this.handleResize = this.handleResize.bind(this)
  }

  componentDidMount() {
    this.dimensionsListener = Dimensions.addEventListener('change', this.handleResize)
  }

  componentWillUnmount() {
    if (this.dimensionsListener && this.dimensionsListener.remove) {
      this.dimensionsListener.remove()
    } else if (this.dimensionsListener) {
      // Old API fallback (for legacy RN):
      // Dimensions.removeEventListener('change', this.handleResize)
      // In modern RN, listeners should be removed via the object returned by addEventListener
      // So do nothing here
    }
  }

  handleResize(_: any) {
    // Increment a dummy key to force a re-render
    this.resizeKey++;
    this.setState({});
  }

  componentDidUpdate(prevProps: ModalProps) {
    if (prevProps.visible === true && this.props.visible === false) {
      this.reset()
    }
  }

  handleLayoutChange = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    this.layout = layout
  }

  measure(): Promise<Layout> {
    if (typeof __TEST__ !== 'undefined' && __TEST__) {
      return Promise.resolve({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      })
    }
    // Try synchronous measurement if available (Fabric)
    if (this.layout && typeof this.layout.x === 'number' && typeof this.layout.y === 'number' && typeof this.layout.width === 'number' && typeof this.layout.height === 'number') {
      return Promise.resolve(this.layout)
    }
    // Fallback: async measure (should rarely be needed)
    return Promise.resolve({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  }

  handleTooltipLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout
    if (this.state.tooltipHeight !== height) {
      this.setState({ tooltipHeight: height })
    }
  }

  async _animateMove(
    obj: Move = {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    },
  ) {
    // Use synchronous layout if possible
    const layout = (this.layout && typeof this.layout.x === 'number') ? this.layout : await this.measure()

    const center = {
      x: obj.left! + obj.width! / 2,
      y: obj.top! + obj.height! / 2,
    }

    const relativeToLeft = center.x
    const relativeToTop = center.y
    const relativeToBottom = Math.abs(center.y - layout.height!)
    const relativeToRight = Math.abs(center.x - layout.width!)

    const verticalPosition = relativeToBottom > relativeToTop ? 'bottom' : 'top'
    const horizontalPosition =
      relativeToLeft > relativeToRight ? 'left' : 'right'

    const tooltip = {
      top: 0,
      tooltip: 0,
      bottom: 0,
      right: 0,
      maxWidth: 0,
      left: 0,
    }

    if (verticalPosition === 'bottom') {
      tooltip.top = obj.top + obj.height + MARGIN
    } else {
      // tooltip.bottom = layout.height! - (obj.top - MARGIN)
    }

    if (horizontalPosition === 'left') {
      tooltip.right = Math.max(layout.width! - (obj.left + obj.width), 0)
      tooltip.right =
        tooltip.right === 0 ? tooltip.right + MARGIN : tooltip.right
      tooltip.maxWidth = layout.width! - tooltip.right - MARGIN
    } else {
      tooltip.left = Math.max(obj.left, 0)
      tooltip.left = tooltip.left === 0 ? tooltip.left + MARGIN : tooltip.left
      tooltip.maxWidth = layout.width! - tooltip.left - MARGIN
    }

    const duration = this.props.animationDuration! + 200
    const tooltipHeight = this.state.tooltipHeight || 0
    const minY = this.props.safeAreaInsets.top
    const maxY = layout.height! - tooltipHeight - this.props.safeAreaInsets.bottom
    let toValue

    if (verticalPosition === 'bottom') {
      const desired = obj.top + obj.height + MARGIN
      toValue = Math.min(Math.max(desired, minY), maxY)
    } else {
      const tooltipBottomOffset = this.props.currentStep?.tooltipBottomOffset || 0;
      const desired = obj.top - MARGIN - tooltipHeight - tooltipBottomOffset;
      toValue = Math.min(Math.max(desired, minY), maxY)
    }

    const translateAnim = Animated.timing(this.state.tooltipTranslateY, {
      toValue,
      duration,
      easing: this.props.easing,
      delay: duration,
      useNativeDriver: true,
    })
    const opacityAnim = Animated.timing(this.state.opacity, {
      toValue: 1,
      duration,
      easing: this.props.easing,
      delay: duration,
      useNativeDriver: true,
    })
    this.state.opacity.setValue(0)
    // Set the tooltip content when the opacity is 0
    this.setState({
      isFirstStep: this.props.isFirstStep,
      isLastStep: this.props.isLastStep,
      currentStep: this.props.currentStep,
    })
    if (
      // @ts-ignore
      toValue !== this.state.tooltipTranslateY._value &&
      !this.props.currentStep?.keepTooltipPosition
    ) {
      Animated.parallel([translateAnim, opacityAnim]).start()
    } else {
      opacityAnim.start()
    }

    this.setState({
      tooltip,
      layout,
      size: {
        x: obj.width,
        y: obj.height,
      },
      position: {
        x: Math.floor(Math.max(obj.left, 0)),
        y: Math.floor(Math.max(obj.top, 0)),
      },
    })
  }

  animateMove(obj = {}): Promise<void> {
    return new Promise((resolve) => {
      this.setState({ containerVisible: true }, () =>
        this._animateMove(obj as any).then(resolve),
      )
    })
  }

  reset() {
    this.setState({
      containerVisible: false,
      layout: undefined,
    })
  }

  handleNext = () => {
    this.props.next()
  }

  handlePrev = () => {
    this.props.prev()
  }

  handleStop = () => {
    this.reset()
    this.props.stop()
  }

  renderMask = () => (
    <SvgMask
      style={styles.overlayContainer}
      size={this.state.size!}
      position={this.state.position!}
      easing={this.props.easing}
      animationDuration={this.props.animationDuration}
      backdropColor={this.props.backdropColor}
      currentStep={this.props.currentStep}
      maskOffset={this.props.maskOffset}
      borderRadius={this.props.borderRadius}
      dismissOnPress={this.props.dismissOnPress}
      stop={this.props.stop}
    />
  )

  renderTooltip() {
    const { tooltipComponent: TooltipComponent, visible } = this.props

    if (!visible) {
      return null
    }

    const { opacity } = this.state
    return (
      <Animated.View
        pointerEvents='box-none'
        key='tooltip'
        style={[
          styles.tooltip,
          this.props.tooltipStyle,
          {
            zIndex: 99,
            opacity,
            transform: [{ translateY: this.state.tooltipTranslateY }],
          },
        ]}
      >
        <View onLayout={this.handleTooltipLayout}>
          <TooltipComponent
            isFirstStep={this.state.isFirstStep}
            isLastStep={this.state.isLastStep}
            currentStep={this.state.currentStep!}
            handleNext={this.handleNext}
            handlePrev={this.handlePrev}
            handleStop={this.handleStop}
            labels={this.props.labels}
          />
        </View>
      </Animated.View>
    )
  }

  renderNonInteractionPlaceholder() {
    return this.props.preventOutsideInteraction ? (
      <View
        style={[StyleSheet.absoluteFill, styles.nonInteractionPlaceholder]}
      />
    ) : null
  }

  handleOverlayLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    this.layout = { x: 0, y: 0, width, height };
    if (this.props.currentStep && this.props.currentStep.target && this.props.currentStep.target.measure) {
      this.props.currentStep.target.measure().then((size: any) => {
        this.setState({
          size: { x: size.width, y: size.height },
          position: { x: size.x, y: size.y },
        }, () => {
          this._animateMove({
            top: size.y,
            left: size.x,
            width: size.width,
            height: size.height,
          });
        });
      });
    }
  }

  render() {
    const containerVisible = this.state.containerVisible || this.props.visible
    const contentVisible = this.state.layout && containerVisible
    if (!containerVisible) {
      return null
    }
    return (
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
        pointerEvents='box-none'
        onLayout={this.handleOverlayLayout}
      >
        <View
          style={[StyleSheet.absoluteFillObject, styles.container]}
          onLayout={this.handleLayoutChange}
          pointerEvents='box-none'
        >
          {contentVisible && (
            <>
              {this.renderMask()}
              {this.renderNonInteractionPlaceholder()}
              {this.renderTooltip()}
            </>
          )}
        </View>
      </View>
    )
  }
}

export function ModalWithInsets(props: Omit<ModalProps, 'safeAreaInsets'>) {
  const insets = useSafeAreaInsets();
  // Always use insets, fallback to 24 if not available
  const safeAreaInsets = {
    top: typeof insets.top === 'number' ? insets.top : 24,
    bottom: typeof insets.bottom === 'number' ? insets.bottom : 24,
  };
  return <Modal {...props} safeAreaInsets={safeAreaInsets} />;
}
