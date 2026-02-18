const { EmbedBuilder, Colors } = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "grole",
  description: "إضافة عضو لقروب باسم القروب أو آيدي الكاتجوري.",
  usage: ["grole <groupNameOrCategoryID> @user"],
  run: async (client, message, args) => {
    if (args.length < 2)
      return message.reply("اكتب اسم القروب أو آيدي الكاتجوري ثم منشن العضو.");

    const groupOrCategoryId = args[0];
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply("يجب منشن عضو صحيح.");

    let groupInfo;
    try {
      const category = message.guild.channels.cache.get(groupOrCategoryId);
      if (category) {
        groupInfo = await Data.get(
          `category_${category.id}_${message.guild.id}`
        );
      } else {
        const groupName = groupOrCategoryId.toLowerCase();
        groupInfo = await Data.get(`group_${groupName}_${message.guild.id}`);
      }
    } catch (e) {
      console.error("DB error:", e);
      return message.reply("خطأ أثناء جلب بيانات القروب. حاول لاحقًا.");
    }

    if (!groupInfo)
      return message.reply("لا يوجد قروب بهذا الاسم أو الكاتجوري.");

    if (
      message.author.id !== groupInfo.ownerId &&
      !(groupInfo.admins || []).includes(message.author.id)
    )
      return message.reply("ليست لديك صلاحية إدارة هذا القروب.");

    const groupRole = message.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === groupInfo.groupRoleName.toLowerCase()
    );
    if (!groupRole) return message.reply("تعذر العثور على رول القروب.");

    if (userMention.roles.cache.has(groupRole.id))
      return message.reply("هذا العضو عضو بالفعل في القروب.");

    try {
      await userMention.roles.add(groupRole);
      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(
          `✅ تمت إضافة <@${userMention.id}> إلى القروب **${groupInfo.name}**.`
        );
      return message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error("Add member error:", e);
      return message.reply("حدث خطأ أثناء إضافة العضو. تحقق من الصلاحيات.");
    }
  },
};
