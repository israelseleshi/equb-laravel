import React from 'react'
import { View, Text } from 'react-native'

export const Ionicons = function(props: any) {
  return React.createElement(
    View,
    { style: props.style, testID: 'icon-' + (props.name || ''), ...props },
    React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, props.name || '')
  )
}

export default { Ionicons }
