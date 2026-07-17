import React from 'react'
import { View } from 'react-native'

export const LinearGradient = function(props: any) {
  return React.createElement(View, { style: props.style, testID: 'linear-gradient' }, props.children)
}

export default LinearGradient
