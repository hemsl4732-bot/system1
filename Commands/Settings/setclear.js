// Commands/Setup/setclear.js — Discord.js v14
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} = require("discord.js");
const db = require("pro.db");
const { prefix, owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "setclear",
  description: "To set channel room",
  usage: ` setclear <#channel>`,
  run: async (client, message) => {
    if (!owners.includes(message.author.id)) return message.react("❌");
    const isEnabled = db.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    const Color =
      db.get(`Guild_Color = ${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      "#f5f5ff";

    const mentionedChannel = message.mentions.channels.first();
    const channelIdArgument = message.content.split(" ")[1];
    const channel = mentionedChannel || message.guild.channels.cache.get(channelIdArgument);

    if (!channel) {
      const embed = new EmbedBuilder()
        .setColor(Color)
        .setDescription(`**يرجى استعمال الأمر بالطريقة الصحيحة .\n setclear <#${message.channel.id}>**`);
      return message.reply({ embeds: [embed] });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("clearOptions")
      .setPlaceholder("قم باختيار الخيار المناسب لك.")
      .addOptions(
        { label: "علبة الألوان", description: "لإختيار علبه الآلوان بنظام القائمة", value: "colorsClear", emoji: "🎨" },
        { label: "علبة الألوان", description: "لإختيار علبه الآلوان بنظام العادي", value: "normalClear", emoji: "🎨" },
        { label: "إلغاء تحديد", description: "لإلغاء تحديد شاتات علبه الآلوان المحفوظه", value: "Deletecolorslinst", emoji: "🎨" },
      );

    const cancelBtn = new ButtonBuilder().setCustomId("Cancel2").setLabel("الغاء").setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(menu);
    const rowBtn = new ActionRowBuilder().addComponents(cancelBtn);

    const panel = await message.reply({ content: "**اختار النظام المفضل لديك لعلبة الألوان.**", components: [row, rowBtn] });

    const collector = panel.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id && ["clearOptions", "Cancel2"].includes(i.customId),
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "Cancel2") {
        await i.message.delete().catch(() => {});
        collector.stop();
        return;
      }

      const selected = i.values[0];
      if (selected === "colorsClear") {
        db.delete(`avtclear`);
        db.set(`Channel = [ Colors ]`, channel.id);
        await message.react("✅");
      } else if (selected === "normalClear") {
        db.delete(`Channel = [ Colors ]`);
        db.set(`avtclear`, channel.id);
        await message.react("✅");
      } else if (selected === "Deletecolorslinst") {
        db.delete(`Channel = [ Colors ]`);
        db.delete(`avtclear`);
        await message.react("✅");
      }

      await i.message.delete().catch(() => {});
      collector.stop();
    });
  },
};
