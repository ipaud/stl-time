/** electron-vite emits the file and resolves the import to its runtime path. */
declare module '*?asset' {
  const path: string
  export default path
}
