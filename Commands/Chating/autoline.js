const db = require("pro.db");
const { prefix, owners } = require(`${process.cwd()}/config`);
const { EmbedBuilder, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

module.exports = {
  name: "autoline",
  description: "To set image URL and channel",
  usage: ` autoline <imageURL1> <#channel2> ...`,
  run: async (client, message, args) => {
    if (!owners.includes(message.author.id)) return message.react("❌");
    const isEnabled = db.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    const Color = db.get(`Guild_Color = ${message.guild.id}`) || "#f5f5ff";
    if (!Color) return;

    const fullText = message.content.substring(prefix.length + "autoline".length + 1);
    const fullArgs = fullText.split(/\s+/);

    if (fullArgs.length % 2 !== 0 || fullArgs.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(Color)
        .setDescription(`**يرجى استعمال الأمر بالطريقة الصحيحة .**\n autoline <imageURL1> <#channel2> ...`);
      return message.reply({ embeds: [embed] });
    }

    const storedChannels = (await db.get("Channels")) || [];

    for (let i = 0; i < fullArgs.length; i += 2) {
      const imageURL = fullArgs[i];
      const channelMention = fullArgs[i + 1];
      const channelID = channelMention.replace(/[^0-9]/g, "");
      const channel = message.guild.channels.cache.get(channelID);

      if (!channel || channel.type !== ChannelType.GuildText) {
        return message.react("❌");
      }

      const idx = storedChannels.findIndex((c) => c.channelID === channelID);
      if (idx !== -1) storedChannels[idx].imageURL = imageURL;
      else storedChannels.push({ channelID, imageURL });
    }

    for (const channel of storedChannels) {
      const imageURL = channel.imageURL;
      const imageFileName = `Line_${channel.channelID}.png`;
      const imagePath = path.join(process.cwd(), "Fonts", imageFileName);
      try {
        const res = await fetch(imageURL);
        const buffer = await res.buffer();
        fs.writeFileSync(imagePath, buffer);
        channel.imageURL = imagePath;
      } catch (e) {
        console.error(e);
      }
    }

    db.set(
      "Channels",
      storedChannels.map((c) => ({ channelID: c.channelID, fontURL: c.imageURL }))
    );
    message.react("✅");
  },
};
