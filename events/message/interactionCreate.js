const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require("discord.js");
const db = require("pro.db");
const path = require("path");

// المسار الصحيح للوصول للملف من داخل مجلد events
// نخرج خطوة (..) ثم ندخل commands ثم tickets
const closeCommand = require("../commands/tickets/close.js");

module.exports = async (client, interaction) => {
    try {
        // 1. فتح التذكرة
        if (interaction.isStringSelectMenu() && interaction.customId === "M0") {
            // حل مشكلة الرسالة الحمراء (التأخير)
            await interaction.deferReply({ ephemeral: true });

            const guildId = interaction.guild.id;
            const categoryId = db.get(`Cat = [${guildId}]`);
            const roleId = db.get(`Role = [${guildId}]`);

            if (!categoryId || !roleId) {
                return interaction.editReply({ content: "⚠️ الإعدادات ناقصة (الكاتيجوري أو الرتبة)." });
            }

            // منع التذاكر المكررة
            const check = db.get(`member${interaction.user.id}`);
            if (check && interaction.guild.channels.cache.has(check)) {
                return interaction.editReply({ content: "❌ لديك تذكرة مفتوحة بالفعل!" });
            }

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                    { id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            db.set(`channel${channel.id}`, interaction.user.id);
            db.set(`member${interaction.user.id}`, channel.id);

            // تصميم الرسالة (مثل الصورة اللي ارسلتها)
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("close_ticket_btn").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("notify_staff").setEmoji("🔔").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("add_member").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("change_color").setEmoji("🎨").setStyle(ButtonStyle.Secondary)
            );

            const welcome = db.get(`tcsend_${guildId}`) || "مرحباً بك، يرجى كتابة طلبك.";
            const embed = new EmbedBuilder()
                .setColor("#d3a35a")
                .setDescription(`${welcome} <@${interaction.user.id}>`);

            await channel.send({ 
                content: `نوع التذكرة : ${interaction.values[0]}`,
                embeds: [embed], 
                components: [row] 
            });

            await interaction.editReply({ content: `✅ تم فتح التذكرة: ${channel}` });
        }

        // 2. معالجة الأزرار (زر الحذف)
        if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
            // محاكاة رسالة لتشغيل كود close.js
            const fakeMessage = {
                guild: interaction.guild,
                channel: interaction.channel,
                author: interaction.user,
                member: interaction.member,
                reply: (c) => interaction.reply(c),
                react: (e) => interaction.channel.send(e)
            };
            
            await closeCommand.run(client, fakeMessage);
        }

    } catch (error) {
        console.error("Interaction Error:", error);
    }
};
