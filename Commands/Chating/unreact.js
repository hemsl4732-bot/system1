const { EmbedBuilder } = require("discord.js");
const { prefix, owners } = require(`${process.cwd()}/config`);
const dwb = require("pro.db");

module.exports = {
  name: "unreact",
  aliases: ["unreact"],
  description: "Remove react config for a channel",
  run: async (client, message) => {
    const Color = dwb.get(`Guild_Color = ${message.guild.id}`) || "#f5f5ff";
    if (!Color) return;

    if (!owners.includes(message.author.id)) return message.react("❌");
    const isEnabled = dwb.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    try {
      const args = message.content.split(" ");
      let Channel = args[1];

      if (!Channel) {
        const embed = new EmbedBuilder()
          .setColor(Color)
          .setDescription(`**يرجى استعمال الأمر بالطريقة الصحيحة .\n unreact <#${message.channel.id}>\n**`);
        return message.reply({ embeds: [embed] });
      }

      if (Channel.startsWith("<#") && Channel.endsWith(">")) {
        Channel = Channel.slice(2, -1);
        Channel = message.guild.channels.cache.get(Channel)?.id;
      }

      dwb.delete(`RoomInfo_${Channel}`);
      message.react("✅");
    } catch (error) {
      console.error(error);
      message.react("❌");
    }
  },
};
