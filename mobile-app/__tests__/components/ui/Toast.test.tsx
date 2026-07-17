import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { Text, View } from 'react-native'
import { ToastProvider, useToast } from '../../../src/components/ui/Toast'

describe('Toast', () => {
  it('ToastProvider renders children', async () => {
    let tree: TestRenderer.ReactTestRenderer
    await act(async () => {
      tree = TestRenderer.create(
        <ToastProvider>
          <View><Text>Child Content</Text></View>
        </ToastProvider>
      )
    })
    const texts = tree!.root.findAllByType(Text)
    expect(texts.some(t => t.props.children === 'Child Content')).toBe(true)
  })

  it('useToast returns showToast function', async () => {
    let showToastFn: any = null
    function TestConsumer() {
      const toast = useToast()
      showToastFn = toast.showToast
      return <Text>OK</Text>
    }
    await act(async () => {
      TestRenderer.create(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      )
    })
    expect(showToastFn).toBeDefined()
    expect(typeof showToastFn).toBe('function')
  })

  it('showToast can be called without throwing', async () => {
    let toastFn: any = null
    function TestConsumer() {
      const { showToast } = useToast()
      toastFn = showToast
      return <Text>OK</Text>
    }
    await act(async () => {
      TestRenderer.create(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      )
    })
    expect(() => toastFn('Test', 'success')).not.toThrow()
    expect(() => toastFn('Test', 'error')).not.toThrow()
    expect(() => toastFn('Test', 'info')).not.toThrow()
  })

  it('logs error when useToast used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      function BadComponent() {
        useToast()
        return <Text>Bad</Text>
      }
      TestRenderer.create(<BadComponent />)
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
