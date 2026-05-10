declare module 'docxtemplater-image-module-free' {
  interface ImageModuleOptions {
    centered?: boolean
    fileType?: string
    getImage: (tagValue: unknown, tagName: string) => Buffer
    getSize: (img: Buffer, tagValue: unknown, tagName: string) => [number, number]
  }
  class ImageModule {
    constructor(options: ImageModuleOptions)
  }
  export = ImageModule
}
