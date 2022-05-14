import {
  CategoryChannelResolvable,
  Client,
  Intents,
  TextChannel,
} from 'discord.js'
import { Whatsapp, create } from 'venom-bot'

const setup = async () => {
  discordSetup()
}

const discordSetup = () => {
  try {
    const client = new Client({
      intents: [
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    })

    client.on('ready', async (client) => {
      console.info('Discord setup ready.')

      const guilds = client.guilds.cache

      const guildNames = guilds.map((v) => ({ name: v.name, id: v.id }))

      console.info('Logging all guilds:')
      console.log(guildNames)

      if (guildNames.length > 1) {
        throw new Error('Bot running on more than one server. Shutting down.')
      }

      const syncMainChannels = async () => {
        console.info('Syncing main channels.')

        const createMainChannels = guilds.map((v) => {
          const missingMainChannel =
            v.channels.cache.find((f) => {
              const channelMatches =
                f.name === 'main' && f.isText() && !f.isThread()

              const parentMatches = f.parent === null

              return channelMatches && parentMatches
            }) === undefined

          if (missingMainChannel) {
            return v.channels.create('main', { type: 'GUILD_TEXT' })
          }
        })

        await Promise.all(createMainChannels)

        console.info('Main channels synced.')
      }

      await syncMainChannels()

      const syncCategories = async () => {
        console.info('Syncing categories.')

        const createCategories = guilds
          .map((v) => {
            const promises = []

            const missingDmCategory =
              v.channels.cache.find((f) => {
                const channelMatches =
                  f.name === 'Direct messages' && f.type === 'GUILD_CATEGORY'

                const parentMatches = f.parent === null

                return channelMatches && parentMatches
              }) === undefined

            const missingGroupsCategory =
              v.channels.cache.find((f) => {
                const channelMatches =
                  f.name === 'Groups' && f.type === 'GUILD_CATEGORY'

                const parentMatches = f.parent === null

                return channelMatches && parentMatches
              }) === undefined

            if (missingDmCategory) {
              promises.push(
                v.channels.create('Direct messages', {
                  type: 'GUILD_CATEGORY',
                })
              )
            }

            if (missingGroupsCategory) {
              promises.push(
                v.channels.create('Groups', {
                  type: 'GUILD_CATEGORY',
                })
              )
            }

            return promises
          })
          .flat()

        await Promise.all(createCategories)

        console.info('Categories synced.')
      }

      await syncCategories()

      await whatsappSetup(client)
    })

    client.login(process.env.DISCORD_CLIENT_TOKEN)
  } catch (error) {
    console.info('Discord error.')

    console.error(error)
  }
}

const whatsappSetup = async (client: Client) => {
  try {
    const venom = await create({
      session: 'main',
      debug: true,
      multidevice: true,
      waitForLogin: true,
      logQR: true,
    })

    // const chats = await venom.getAllChats()

    venom.onAnyMessage((message) => {
      if (message.sender.isMe) return

      const name = message.sender.name

      const targetCategory = message.isGroupMsg ? 'Groups' : 'Direct messages'

      client.guilds.cache.forEach(async (v) => {
        const contactChannel = v.channels.cache.find((f) => {
          const nameMatches = f.name === name

          const typeMatches = f.type === 'GUILD_TEXT'

          const categoryMatches = f.parent?.name === targetCategory

          return nameMatches && typeMatches && categoryMatches
        }) as TextChannel | undefined

        const contactChannelExists = contactChannel !== undefined

        const targetCategoryRef = v.channels.cache.find(
          (f) => f.name === targetCategory && f.type === 'GUILD_CATEGORY'
        ) as CategoryChannelResolvable | undefined

        const sendMessage = async (channel: TextChannel) => {
          await channel.send(
            message.content ??
              { sticker: '<sticker>' }[message.type] ??
              'unknown'
          )
        }

        if (!contactChannelExists) {
          const newChannel = await v.channels.create(name, {
            parent: targetCategoryRef,
            topic: name,
          })

          await sendMessage(newChannel)

          return
        }

        await sendMessage(contactChannel)
      })
    })

    client.on('messageCreate', async (message) => {
      if (message.author.bot || message.author.dmChannel) return

      const shouldIgnoreEvent = async () => {
        const typeMismatch = message.channel.type !== 'GUILD_TEXT'

        if (typeMismatch) {
          return true
        }

        const newChannel = message.channel as TextChannel

        const parentName = newChannel.parent?.name

        const categoryMismatch =
          parentName !== 'Direct messages' && parentName !== 'Groups'

        return categoryMismatch
      }

      const ignoreEvent = await shouldIgnoreEvent()

      if (ignoreEvent) return

      const channel = message.channel as TextChannel

      const targetChatName = channel.topic ?? ''

      const chats = await venom.getAllChats()

      const targetChat = chats.find((f) => f.contact.name === targetChatName)

      if (targetChat === undefined) {
        console.error(`Chat ${targetChatName} not found`)

        return
      }

      const newTargetContact = targetChat!

      try {
        await venom.sendText(newTargetContact.id._serialized, message.content)
      } catch (error) {
        console.error(error)
      }
    })

    console.info('Whatsapp setup ready.')
  } catch (error) {
    console.info('Whatsapp error.')

    console.error(error)
  }
}

setup()
