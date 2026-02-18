const {
  EmbedBuilder,
  Colors,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "delgroup",
  aliases: ["deletegroup"],
  description: "حذف قروب (كاتجوري) مع قنواته وروله.",
  usage: ["delgroup <groupName>"],
  run: async (client, message, args) => {
    if (!args.length) return message.reply("اكتب اسم القروب المراد حذفه.");

    const groupName = args.join(" ");
    const groupKey = `group_${groupName}_${message.guild.id}`;

    const groupInfo = await Data.get(groupKey);
    if (!groupInfo) return message.reply("لا توجد مجموعة بهذا الاسم.");

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return message.reply("لا تملك صلاحية حذف القنوات.");

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `هل أنت متأكد أنك تريد حذف المجموعة **${groupName}** وجميع قنواتها؟ العملية غير قابلة للتراجع.`
      );

    const ask = await message.channel.send({ embeds: [embed] });
    await ask.react("✅");
    await ask.react("❌");

    const filter = (r, u) =>
      ["✅", "❌"].includes(r.emoji.name) && u.id === message.author.id;

    ask
      .awaitReactions({ filter, max: 1, time: 30_000, errors: ["time"] })
      .then(async (col) => {
        const r = col.first();
        if (r.emoji.name === "✅") {
          try {
            const category = message.guild.channels.cache.find(
              (c) => c.name === groupName && c.type === ChannelType.GuildCategory
            );
            if (category) {
              const children = message.guild.channels.cache.filter(
                (ch) => ch.parentId === category.id
              );
              for (const ch of children.values()) {
                await ch.delete(`Deleting channel of group: ${groupName}`);
              }
              await category.delete("Group deletion requested by user.");
            }

            const role = message.guild.roles.cache.find(
              (rr) => rr.name === groupInfo.groupRoleName
            );
            if (role) await role.delete("Group role deletion requested by user.");

            await Data.delete(groupKey);
            message.channel.send(
              `تم حذف المجموعة **${groupName}** وقنواتها ودورها بنجاح.`
            );
          } catch (e) {
            console.error(e);
            message.reply("حدث خطأ أثناء حذف المجموعة. حاول لاحقًا.");
          }
        } else {
          message.channel.send("تم إلغاء حذف المجموعة.");
        }
      })
      .catch(() =>
        message.reply("لم يتم التفاعل في الوقت المحدد. تم إلغاء الحذف.")
      );
  },
};
