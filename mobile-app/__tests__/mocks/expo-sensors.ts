export const Accelerometer = {
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeAllListeners: jest.fn(),
  setUpdateInterval: jest.fn(),
}

export default { Accelerometer }
