const { EmbedBuilder, Colors } = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "rerole",
  description: "إزالة عضو من قروب محدد.",
  usage: ["rerole @user <groupName>"],
  run: async (client, message, args) => {
    const userMention = message.mentions.members.first();
    const groupName = args[1];

    if (!userMention || !groupName)
      return message.reply("يرجى منشن العضو وكتابة اسم القروب.");

    try {
      const groupInfo = await Data.get(`group_${groupName}_${message.guild.id}`);
      if (!groupInfo) return message.reply("القروب غير موجود.");

      const groupRole = message.guild.roles.cache.find(
        (r) => r.name === groupInfo.groupRoleName
      );
      if (!groupRole) return message.reply("رول القروب غير موجود.");

      if (!userMention.roles.cache.has(groupRole.id))
        return message.reply(`العضو <@${userMention.id}> ليس داخل هذا القروب.`);

      await userMention.roles.remove(groupRole);

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(
          `تمت إزالة <@${userMention.id}> من القروب **${groupName}** بنجاح!`
        );
      return message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error("Failed to remove member:", e);
      return message.reply("حدث خطأ أثناء إزالة العضو. حاول مجددًا.");
    }
  },
};
