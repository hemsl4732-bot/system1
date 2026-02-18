const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "panel",
  description: "عرض معلومات القروب والتحكم السريع.",
  usage: ["ginfo <groupNameOrId>"],
  run: async (client, message, args) => {
    let key = args[0];

    // دعم "قروبي"
    if (key === "قروبي") {
      const g = await Data.get(
        `user_group_${message.author.id}_${message.guild.id}`
      );
      if (!g) return message.reply("لا يوجد لديك أي قروب في هذا السيرفر.");
      key = g;
    }
    if (!key) return message.reply("أدخل اسم القروب أو آيدي القروب.");

    try {
      let groupInfo;
      if (isNaN(key)) {
        groupInfo = await Data.get(`group_${key.toLowerCase()}_${message.guild.id}`);
      } else {
        groupInfo = await Data.get(`group_id_${key}`);
      }
      if (!groupInfo) return message.reply("القروب المحدد غير موجود.");

      const isAdmin = await Data.get(`group_admin_${groupInfo.name}_${message.author.id}`);
      if (message.author.id !== groupInfo.ownerId && !isAdmin)
        return message.reply("ليس لديك صلاحيات لاستخدام هذا الأمر.");

      const owner = await message.guild.members
        .fetch(groupInfo.ownerId)
        .catch(() => null);
      if (!owner) return message.reply("تعذر العثور على مالك هذا القروب.");

      const groupRole = message.guild.roles.cache.find(
        (r) => r.name === groupInfo.groupRoleName
      );
      if (!groupRole) return message.reply("تعذر العثور على رول القروب.");

      const groupMembers = message.guild.members.cache.filter((m) =>
        m.roles.cache.has(groupRole.id)
      );

      const memberCount = groupMembers.size;
      await Data.set(`group_member_count_${groupInfo.groupRoleId}`, memberCount);
      const adminCount =
        (await Data.get(`group_admin_count_${groupInfo.name}`)) || 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`add_member_${groupInfo.name}`)
          .setLabel("اضافة عضو الى القروب")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`remove_member_${groupInfo.name}`)
          .setLabel("ازالة عضو من القروب")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`list_members_${groupInfo.name}`)
          .setLabel("عرض الأعضاء")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`add_admin_${groupInfo.name}`)
          .setLabel("اضافة ادمن للقروب")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`remove_admin_${groupInfo.name}`)
          .setLabel("ازالة ادمن من القروب")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("معلومات القروب")
        .setDescription(`تفاصيل القروب **${groupInfo.name}**`)
        .addFields(
          { name: "المالك", value: owner.user.tag, inline: true },
          { name: "عدد الأعضاء", value: `${memberCount}`, inline: true },
          { name: "عدد الأدمنين", value: `${adminCount}`, inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `طلب من ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        });

      await message.channel.send({ embeds: [embed], components: [row] });

      const filter = (i) =>
        [
          "add_member_",
          "remove_member_",
          "list_members_",
          "add_admin_",
          "remove_admin_",
        ].some((p) => i.customId.startsWith(p));

      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== groupInfo.ownerId) {
          await interaction.reply({
            content: "ليس لديك صلاحيات لاستخدام هذه الأزرار.",
            ephemeral: true,
          });
          return;
        }

        if (interaction.customId.startsWith("list_members_")) {
          const membersList =
            groupMembers.map((m) => `<@${m.id}>`).join(", ") ||
            "لا يوجد أعضاء في هذا القروب.";
          const e = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("أعضاء القروب")
            .setDescription(membersList)
            .setTimestamp()
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL(),
            });
          return interaction.reply({ embeds: [e], ephemeral: true });
        }

        if (interaction.customId.startsWith("add_member_")) {
          await interaction.reply({
            content: "منشن الي تبي تضيفه للقروب:",
            ephemeral: true,
          });
          const rf = (r) =>
            r.mentions.members.size > 0 && r.author.id === interaction.user.id;

          const mc = interaction.channel.createMessageCollector({
            filter: rf,
            time: 15000,
          });

          mc.on("collect", async (msg) => {
            const target = msg.mentions.members.first();
            if (target) {
              await target.roles
                .add(groupRole)
                .catch(() =>
                  msg.reply("تعذر إضافة العضو. تحقق من الصلاحيات.")
                );

              await Data.set(
                `group_member_${groupInfo.groupRoleId}_${target.id}`,
                { userId: target.id, groupId: groupInfo.groupRoleId }
              );
              const curr =
                (await Data.get(
                  `group_member_count_${groupInfo.groupRoleId}`
                )) || 0;
              await Data.set(
                `group_member_count_${groupInfo.groupRoleId}`,
                curr + 1
              );

              await msg.reply(
                `تمت إضافة <@${target.id}> إلى القروب **${groupInfo.name}** بنجاح!`
              );
            }
            mc.stop();
          });

          mc.on("end", (col) => {
            if (col.size === 0)
              interaction.followUp({
                content: "لم يتم ذكر أي مستخدم في الوقت المحدد!",
                ephemeral: true,
              });
          });
          return;
        }

        if (interaction.customId.startsWith("remove_member_")) {
          await interaction.reply({
            content: "منشن الي تبي تزيله من القروب:",
            ephemeral: true,
          });
          const rf = (r) =>
            r.mentions.members.size > 0 && r.author.id === interaction.user.id;

          const mc = interaction.channel.createMessageCollector({
            filter: rf,
            time: 15000,
          });

          mc.on("collect", async (msg) => {
            const target = msg.mentions.members.first();
            if (target) {
              await target.roles
                .remove(groupRole)
                .catch(() =>
                  msg.reply("تعذر إزالة العضو. تحقق من الصلاحيات.")
                );

              await Data.delete(
                `group_member_${groupInfo.groupRoleId}_${target.id}`
              );

              const curr =
                (await Data.get(
                  `group_member_count_${groupInfo.groupRoleId}`
                )) || 1;
              await Data.set(
                `group_member_count_${groupInfo.groupRoleId}`,
                Math.max(curr - 1, 0)
              );

              await msg.reply(
                `تمت إزالة <@${target.id}> من القروب **${groupInfo.name}** بنجاح!`
              );
            }
            mc.stop();
          });

          mc.on("end", (col) => {
            if (col.size === 0)
              interaction.followUp({
                content: "لم يتم ذكر أي مستخدم في الوقت المحدد!",
                ephemeral: true,
              });
          });
          return;
        }

        if (interaction.customId.startsWith("add_admin_")) {
          await interaction.reply({
            content: "منشن العضو الذي تود إضافته كأدمن:",
            ephemeral: true,
          });
          const rf = (r) =>
            r.mentions.members.size > 0 && r.author.id === interaction.user.id;

          const ac = interaction.channel.createMessageCollector({
            filter: rf,
            time: 15000,
          });

          ac.on("collect", async (msg) => {
            const target = msg.mentions.members.first();
            if (target) {
              await Data.set(`group_admin_${groupInfo.name}_${target.id}`, {
                userId: target.id,
                groupName: groupInfo.name,
              });
              const curr =
                (await Data.get(`group_admin_count_${groupInfo.name}`)) || 0;
              await Data.set(
                `group_admin_count_${groupInfo.name}`,
                curr + 1
              );
              await msg.reply(
                `تمت إضافة <@${target.id}> كأدمن في القروب **${groupInfo.name}** بنجاح!`
              );
            }
            ac.stop();
          });

          ac.on("end", (col) => {
            if (col.size === 0)
              interaction.followUp({
                content: "لم يتم ذكر أي مستخدم في الوقت المحدد!",
                ephemeral: true,
              });
          });
          return;
        }

        if (interaction.customId.startsWith("remove_admin_")) {
          await interaction.reply({
            content: "منشن العضو الذي تود إزالته كأدمن:",
            ephemeral: true,
          });
          const rf = (r) =>
            r.mentions.members.size > 0 && r.author.id === interaction.user.id;

          const rc = interaction.channel.createMessageCollector({
            filter: rf,
            time: 15000,
          });

          rc.on("collect", async (msg) => {
            const target = msg.mentions.members.first();
            if (target) {
              await Data.delete(`group_admin_${groupInfo.name}_${target.id}`);
              const curr =
                (await Data.get(`group_admin_count_${groupInfo.name}`)) || 1;
              await Data.set(
                `group_admin_count_${groupInfo.name}`,
                Math.max(curr - 1, 0)
              );
              await msg.reply(
                `تمت إزالة <@${target.id}> كأدمن من القروب **${groupInfo.name}** بنجاح!`
              );
            }
            rc.stop();
          });

          rc.on("end", (col) => {
            if (col.size === 0)
              interaction.followUp({
                content: "لم يتم ذكر أي مستخدم في الوقت المحدد!",
                ephemeral: true,
              });
          });
          return;
        }
      });
    } catch (e) {
      console.error("panel error:", e);
      return message.reply("حدث خطأ أثناء استرجاع معلومات القروب. حاول مجددًا.");
    }
  },
};
