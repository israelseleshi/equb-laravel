import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { PaginationBar } from '../../../src/components/ui/PaginationBar'
import { TouchableOpacity, Text } from 'react-native'

describe('PaginationBar', () => {
  it('renders prev and next navigation buttons', async () => {
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={2} totalPages={5} onPrev={() => {}} onNext={() => {}} />
      )
    })
    // Verify the component rendered with the right number of touchable buttons (prev + next)
    const buttons = tree!.root.findAllByType(TouchableOpacity)
    expect(buttons.length).toBe(2)
  })

  it('calls onPrev when prev button pressed', async () => {
    const onPrev = jest.fn()
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={3} totalPages={5} onPrev={onPrev} onNext={() => {}} />
      )
    })
    const buttons = tree!.root.findAllByType(TouchableOpacity)
    await act(async () => {
      if (buttons[0]) buttons[0].props.onPress()
    })
    expect(onPrev).toHaveBeenCalled()
  })

  it('calls onNext when next button pressed', async () => {
    const onNext = jest.fn()
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={3} totalPages={5} onPrev={() => {}} onNext={onNext} />
      )
    })
    const buttons = tree!.root.findAllByType(TouchableOpacity)
    await act(async () => {
      if (buttons[1]) buttons[1].props.onPress()
    })
    expect(onNext).toHaveBeenCalled()
  })

  it('disables prev button on first page', async () => {
    const onPrev = jest.fn()
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={1} totalPages={5} onPrev={onPrev} onNext={() => {}} />
      )
    })
    const buttons = tree!.root.findAllByType(TouchableOpacity)
    if (buttons[0]) {
      expect(buttons[0].props.disabled).toBe(true)
    }
  })

  it('disables next button on last page', async () => {
    const onNext = jest.fn()
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={5} totalPages={5} onPrev={() => {}} onNext={onNext} />
      )
    })
    const buttons = tree!.root.findAllByType(TouchableOpacity)
    if (buttons[1]) {
      expect(buttons[1].props.disabled).toBe(true)
    }
  })

  it('does not render when only one page', async () => {
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <PaginationBar currentPage={1} totalPages={1} onPrev={() => {}} onNext={() => {}} />
      )
    })
    expect(tree!.toJSON()).toBeNull()
  })
})
