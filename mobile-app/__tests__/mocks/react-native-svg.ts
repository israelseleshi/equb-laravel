import React from 'react'
import { View } from 'react-native'

function createMockComponent(name: string) {
  const Component = function(props: any) {
    return React.createElement(View, { testID: 'svg-' + name, ...props }, props.children)
  }
  return Component
}

export const SvgXml = createMockComponent('SvgXml')
export const Svg = createMockComponent('Svg')
export const Circle = createMockComponent('Circle')
export const Path = createMockComponent('Path')
export const G = createMockComponent('G')
export const Rect = createMockComponent('Rect')
export const Text = createMockComponent('SvgText')
export const Polygon = createMockComponent('Polygon')
export const Ellipse = createMockComponent('Ellipse')
export const Defs = createMockComponent('Defs')
export const LinearGradient = createMockComponent('SvgLinearGradient')
export const Stop = createMockComponent('Stop')

export default { SvgXml, Svg, Circle, Path, G, Rect, Text, Polygon, Ellipse, Defs, LinearGradient, Stop }
