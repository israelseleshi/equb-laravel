export const loadAsync = jest.fn().mockResolvedValue(undefined)
export const isLoaded = jest.fn().mockReturnValue(true)
export const useFonts = jest.fn().mockReturnValue([true, null])

export default { loadAsync, isLoaded, useFonts }
