const { EmbedBuilder, Colors } = require("discord.js");
const Data = require("pro.db");
const { prefix, owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "tcsend",
  aliases: ["tcsend"],
  run: async (client, message, args) => {
    const Color = Data.get(`Guild_Color = ${message.guild.id}`) ||
                  message.guild.members.me?.displayHexColor || Colors.Blurple;

    if (!owners.includes(message.author.id)) return message.react("❌");
    const isEnabled = Data.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    const setChannel = Data.get(`setChannel_${message.guild.id}`);
    if (setChannel && message.channel.id !== setChannel) return;

    const text = args.join(" ");
    if (!text) {
      const embed = new EmbedBuilder()
        .setColor(Color)
        .setDescription(`**يرجى استعمال الأمر بالطريقة الصحيحة .\n tcsend مساء الخير، اهلًا بك في تذكرتك.**`);
      return message.reply({ embeds: [embed] });
    }

    Data.set(`tcsend_${message.guild.id}`, text);
    message.react("✅");
  },
};
