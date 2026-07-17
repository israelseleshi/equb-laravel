export const printToFileAsync = jest.fn().mockResolvedValue({
  uri: 'file:///tmp/test.pdf',
  base64: 'dGVzdC1wZGYtY29udGVudA==',
})

export default { printToFileAsync }
