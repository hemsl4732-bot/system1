const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField,
    ChannelType 
} = require("discord.js");
const db = require("pro.db");
const path = require("path");

// تعديل المسار ليتوافق مع مجلد commands/tickets/close.js
const closeCommand = require("../commands/tickets/close.js"); 

module.exports = async (client, interaction) => {
    try {
        // 1. معالجة القوائم (فتح التذكرة)
        if (interaction.isStringSelectMenu() && interaction.customId === "M0") {
            // منع الخطأ الأحمر فوراً
            await interaction.deferReply({ ephemeral: true });

            const guildId = interaction.guild.id;
            const categoryId = db.get(`Cat = [${guildId}]`);
            const roleId = db.get(`Role = [${guildId}]`);

            if (!categoryId || !roleId) {
                return interaction.editReply({ content: "⚠️ الإعدادات ناقصة (تأكد من تحديد الكاتيجوري ورتبة الدعم)." });
            }

            // فحص إذا كان المستخدم لديه تذكرة مفتوحة (تجنب التعليق)
            const oldChannelId = db.get(`member${interaction.user.id}`);
            if (oldChannelId && interaction.guild.channels.cache.has(oldChannelId)) {
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

            // --- الشكل المطلوب (الأزرار الأربعة في صف واحد) ---
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("close_ticket_btn").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("notify_staff").setEmoji("🔔").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("add_member").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("change_color").setEmoji("🎨").setStyle(ButtonStyle.Secondary)
            );

            const welcomeText = db.get(`tcsend_${guildId}`) || "مرحباً عزيزي العميل ،\nيرجى كتابة طلباتك الي حين تواصل الدعم الفني معك";
            const embed = new EmbedBuilder()
                .setColor("#d3a35a")
                .setDescription(`${welcomeText} <@${interaction.user.id}>`);

            await channel.send({ 
                content: `نوع التذكرة : ${interaction.values[0]}`,
                embeds: [embed], 
                components: [row] 
            });

            await interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}` });
        }

        // 2. معالجة الأزرار (إغلاق التذكرة)
        if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
            // تنفيذ كود الإغلاق من الملف المعدل
            const fakeMessage = {
                guild: interaction.guild,
                channel: interaction.channel,
                author: interaction.user,
                member: interaction.member,
                reply: (content) => interaction.reply(content),
                react: (emoji) => interaction.channel.send(emoji)
            };
            
            try {
                await closeCommand.run(client, fakeMessage);
            } catch (err) {
                console.error("فشل استدعاء ملف الإغلاق:", err);
                await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة إغلاق التذكرة.", ephemeral: true });
            }
        }

    } catch (error) {
        console.error("خطأ التفاعل:", error);
    }
};
