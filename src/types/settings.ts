export type BasicSettings = {
  appName: string
  uploads: {
    image: {
      mimeTypes: string[]
      extensions: string[]
    }
    limits: {
      productImageMaxBytes: number
      categoryImageMaxBytes: number
      profileImageMaxBytes: number
    }
  }
}
