declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_CLIENT_TOKEN: string
    }
  }
}

export {}
