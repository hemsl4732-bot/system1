const {
  EmbedBuilder,
  Colors,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
} = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "cgroup",
  description:
    "إنشاء قروب (كاتجوري) مع شات وصوت ورول لمالك القروب، عبر حوار خطوة بخطوة.",
  usage: ["cgroup"],
  run: async (client, message) => {
    if (message.mentions.has(client.user))
      return message.reply("لا تمنشن بوت.");

    const ownerKey = `group_owner_${message.guild.id}`;
    let ownerId;
    try {
      ownerId = await Data.get(ownerKey);
    } catch (e) {
      console.error("DB ownerId error:", e);
      return message.reply("خطأ أثناء جلب ID الأونر من قاعدة البيانات.");
    }

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
      message.author.id !== ownerId
    )
      return message.reply("ليس لديك إذن لإدارة القنوات.");

    const filter = (m) => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({
      filter,
      max: 5,
      time: 60_000,
    });

    let ownerMention, groupName, textName, voiceName, roleName;
    message.channel.send("يرجى ذكر الأونر (مالك القروب).");

    collector.on("collect", async (m) => {
      if (m.mentions.has(client.user))
        return message.reply("لا تمنشن بوت، اذكر مالك القروب مباشرة.");

      if (!ownerMention) {
        ownerMention = m.mentions.members.first();
        if (!ownerMention)
          return message.channel.send("اذكر مستخدم صالح كمالك للقروب.");
        message.channel.send("أدخل اسم القروب.");
      } else if (!groupName) {
        groupName = validateInput(m.content);
        if (!groupName) return message.channel.send("أدخل اسم قروب صالح.");
        message.channel.send("أدخل اسم الشات.");
      } else if (!textName) {
        textName = validateInput(m.content);
        if (!textName) return message.channel.send("أدخل اسم شات صالح.");
        message.channel.send("أدخل اسم القناة الصوتية.");
      } else if (!voiceName) {
        voiceName = validateInput(m.content);
        if (!voiceName) return message.channel.send("أدخل اسم قناة صوتية صالح.");
        message.channel.send("أدخل اسم الدور.");
      } else if (!roleName) {
        roleName = validateInput(m.content);
        if (!roleName) return message.channel.send("أدخل اسم دور صالح.");
        collector.stop();
      }
    });

    collector.on("end", async () => {
      if (!ownerMention || !groupName || !textName || !voiceName || !roleName)
        return message.channel.send("لم تُستكمل جميع البيانات. حاول مجددًا.");

      const exists = await Data.get(`group_${groupName}_${message.guild.id}`);
      if (exists) return message.reply("يوجد قروب بهذا الاسم بالفعل.");

      try {
        const category = await message.guild.channels.create({
          name: groupName,
          type: ChannelType.GuildCategory,
        });

        const textChannel = await message.guild.channels.create({
          name: textName,
          type: ChannelType.GuildText,
          parent: category.id,
        });

        const voiceChannel = await message.guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        const groupRole = await message.guild.roles.create({
          name: roleName,
          color: "Blue",
          permissions: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        });

        await setOverwrites(category, groupRole, message.guild);
        await setOverwrites(textChannel, groupRole, message.guild);
        await setOverwrites(voiceChannel, groupRole, message.guild);

        await ownerMention.roles.add(groupRole);

        const adminId = message.author.id;
        const groupInfo = {
          name: groupName,
          ownerId: ownerMention.id,
          adminId,
          groupRoleName: groupRole.name,
          textChannelId: textChannel.id,
          voiceChannelId: voiceChannel.id,
        };
        await Data.set(`group_${groupName}_${message.guild.id}`, groupInfo);

        const embed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(
            `تم إنشاء القروب **${groupName}** مع الشات **${textChannel.name}** والصوت **${voiceChannel.name}**.\n` +
              `الرول **${groupRole.name}** مُنح لـ <@${ownerMention.id}>.\n\n` +
              `**مهم:** المالك <@${ownerMention.id}> — المشرف الذي أنشأ القروب <@${adminId}>.`
          );
        message.channel.send({ embeds: [embed] });

        const ownerEmbed = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle("تهانينا!")
          .setDescription(
            `تم تعيينك مالكًا للقروب **${groupName}**.\nيمكنك الآن إدارة قنوات القروب ودوره.`
          );
        ownerMention.send({ embeds: [ownerEmbed] }).catch(() => {});
      } catch (e) {
        console.error("Create group error:", e);
        message.reply("حدث خطأ أثناء إنشاء القروب/القنوات/الدور. حاول لاحقًا.");
      }
    });
  },
};

async function setOverwrites(channel, role, guild) {
  await channel.permissionOverwrites.set([
    { id: role.id, allow: [PermissionFlagsBits.ViewChannel] },
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
  ]);
}

function validateInput(input) {
  const re = /^[\w\s-]+$/u;
  return re.test(input) ? input : null;
}
