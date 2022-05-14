import { Client, Intents } from 'discord.js'
import { Whatsapp, create } from 'venom-bot'

const setup = async () => {
  discordSetup()
}

const discordSetup = () => {
  try {
    const client = new Client({
      intents: [Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILDS],
    })

    client.on('ready', async () => {
      console.info('Discord setup ready')

      await whatsappSetup()
    })

    client.login(process.env.DISCORD_CLIENT_TOKEN)
  } catch (error) {
    console.info('Discord error')

    console.error(error)
  }
}

const whatsappSetup = async () => {
  try {
    const venom = await create({
      session: 'main',
      debug: true,
      multidevice: true,
      waitForLogin: true,
      logQR: true,
    })

    const chats = await venom.getAllChats()

    console.info('Whatsapp setup ready')
  } catch (error) {
    console.info('Whatsapp error')

    console.error(error)
  }
}

setup()
