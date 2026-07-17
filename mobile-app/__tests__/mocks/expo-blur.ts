import React from 'react'
import { View } from 'react-native'

export const BlurView = function(props: any) {
  return React.createElement(View, { style: props.style, testID: 'blur-view' }, props.children)
}

export default BlurView
