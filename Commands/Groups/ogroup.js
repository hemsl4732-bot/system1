const { EmbedBuilder, Colors, PermissionsBitField, ChannelType } = require("discord.js");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "ogroup",
  aliases: ["ownergroup"],
  description: "منح ملكية القروب (كاتجوري) لعضو معيّن.",
  usage: ["ogroup @user <categoryId>"],
  run: async (client, message, args) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !owners.includes(message.author.id)
    ) {
      return message.reply("لا تملك صلاحية إدارة الرول.");
    }

    const userMention = message.mentions.members.first();
    const categoryId = args[1];
    if (!userMention) return message.reply("منشن المستخدم المراد منحه الملكية.");
    if (!categoryId) return message.reply("أدخل آيدي الكاتجوري.");

    const category = message.guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory)
      return message.reply(`لا يوجد كاتجوري بهذا الآيدي **${categoryId}**.`);

    try {
      const role = message.guild.roles.cache.find((r) => r.name === category.name);
      if (!role) return message.reply(`لا يوجد رول مرتبط باسم الكاتجوري **${category.name}**.`);

      if (userMention.roles.cache.has(role.id))
        return message.reply(`<@${userMention.id}> يملك الرول بالفعل.`);

      await userMention.roles.add(role);

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("تم منح الملكية")
        .setDescription(`القروب **${category.name}** صار تحت إدارتك الآن!`)
        .addFields(
          { name: "المالك", value: `<@${userMention.id}>`, inline: true },
          { name: "ID الكاتجوري", value: `${categoryId}`, inline: true }
        )
        .setTimestamp();
      await message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error("Grant ownership error:", e);
      message.reply("حدث خطأ أثناء منح الملكية. تحقق من صلاحياتي ثم حاول مجددًا.");
    }
  },
};
