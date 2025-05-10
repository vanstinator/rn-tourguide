import * as React from 'react'
import { BorderRadiusObject, Shape } from '../types'
import { ITourGuideContext } from './TourGuideContext'

declare var __TEST__: boolean

interface Props {
  name: string
  text: string
  order: number
  tourKey: string
  active?: boolean
  shape?: Shape
  context: ITourGuideContext
  children?: any
  maskOffset?: number
  borderRadiusObject?: BorderRadiusObject
  borderRadius?: number
  keepTooltipPosition?: boolean
  tooltipBottomOffset?: number
}

export class ConnectedStep extends React.Component<Props> {
  static defaultProps = {
    active: true,
  }
  wrapper: any
  componentDidMount() {
    if (this.props.active) {
      this.register()
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.active !== prevProps.active) {
      if (this.props.active) {
        this.register()
      } else {
        this.unregister()
      }
    }
  }

  componentWillUnmount() {
    this.unregister()
  }

  setNativeProps(obj: any) {
    this.wrapper.setNativeProps(obj)
  }

  register() {
    if (this.props.context && this.props.context.registerStep) {
      this.props.context.registerStep(this.props.tourKey, {
        target: this,
        wrapper: this.wrapper,
        ...this.props,
      })
    } else {
      console.warn('context undefined')
    }
  }

  unregister() {
    if (this.props.context && this.props.context.unregisterStep) {
      this.props.context.unregisterStep(this.props.tourKey, this.props.name)
    } else {
      console.warn('unregisterStep undefined')
    }
  }

  measure() {
    if (typeof __TEST__ !== 'undefined' && __TEST__) {
      return Promise.resolve({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      })
    }
    // Try synchronous measurement if available (Fabric)
    if (this.wrapper && this.wrapper.measureSync) {
      try {
        const { borderRadius } = this.props
        const [x, y, width, height] = this.wrapper.measureSync()
        return Promise.resolve({
          x: borderRadius ? x + borderRadius : x,
          y,
          width: borderRadius ? width - borderRadius * 2 : width,
          height,
        })
      } catch (e) {
        // fallback to async
      }
    }
    // Fallback: async measure
    return new Promise((resolve, reject) => {
      if (this.wrapper && this.wrapper.measure) {
        const { borderRadius } = this.props
        this.wrapper.measure(
          (
            _ox: number,
            _oy: number,
            width: number,
            height: number,
            x: number,
            y: number,
          ) =>
            resolve({
              x: borderRadius ? x + borderRadius : x,
              y,
              width: borderRadius ? width - borderRadius * 2 : width,
              height,
            }),
          reject,
        )
      } else {
        reject(new Error('No wrapper or measure method available'))
      }
    })
  }

  render() {
    const copilot = {
      ref: (wrapper: any) => {
        this.wrapper = wrapper
      },
      onLayout: () => {}, // Android hack
    }

    return React.cloneElement(this.props.children, { copilot })
  }
}
