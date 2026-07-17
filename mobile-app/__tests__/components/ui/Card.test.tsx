import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { Card } from '../../../src/components/ui/Card'
import { Text } from 'react-native'

describe('Card', () => {
  it('renders children', async () => {
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <Card>
          <Text>Hello</Text>
        </Card>
      )
    })
    const texts = tree!.root.findAllByType(Text)
    expect(texts.some(t => t.props.children === 'Hello')).toBe(true)
  })

  it('renders with custom style prop', async () => {
    const customStyle = { backgroundColor: 'red', margin: 10 }
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <Card style={customStyle}>
          <Text>Styled</Text>
        </Card>
      )
    })
    const view = tree!.root.findByType(Text)
    expect(view).toBeDefined()
  })

  it('renders without crashing', async () => {
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <Card><Text>OK</Text></Card>
      )
    })
    expect(tree!.toJSON()).not.toBeNull()
  })
})
