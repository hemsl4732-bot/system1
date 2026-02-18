const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require("discord.js");
const mongoose = require("mongoose");
const path = require("path");

// استدعاء ملف الإغلاق (تأكد من المسار الصحيح)
const closeCommand = require("../commands/tickets/close.js");

// تعريف شكل البيانات في MongoDB (Schema)
const TicketSchema = mongoose.models.Ticket || mongoose.model("Ticket", new mongoose.Schema({
    guildId: String,
    categoryId: String,
    roleId: String,
    logChannelId: String,
    welcomeMessage: String,
    openTickets: { type: Map, of: String, default: {} } // لتخزين من فتح تذكرة
}));

module.exports = async (client, interaction) => {
    try {
        const guildId = interaction.guild.id;

        // 1. معالجة القوائم (فتح التذكرة)
        if (interaction.isStringSelectMenu() && interaction.customId === "M0") {
            await interaction.deferReply({ ephemeral: true });

            // جلب الإعدادات من MongoDB
            let config = await TicketSchema.findOne({ guildId });
            
            if (!config || !config.categoryId || !config.roleId) {
                return interaction.editReply({ content: "⚠️ لم يتم ضبط الإعدادات في قاعدة البيانات السحابية (استخدم أوامر الإعداد أولاً)." });
            }

            // منع تكرار التذاكر
            if (config.openTickets.get(interaction.user.id)) {
                const oldChannelId = config.openTickets.get(interaction.user.id);
                if (interaction.guild.channels.cache.has(oldChannelId)) {
                    return interaction.editReply({ content: "❌ لديك تذكرة مفتوحة بالفعل!" });
                }
            }

            // إنشاء الروم
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: config.categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                    { id: config.roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            // حفظ حالة التذكرة في MongoDB
            config.openTickets.set(interaction.user.id, channel.id);
            await config.save();

            // إرسال رسالة الترحيب (نفس شكل الصورة)
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("close_ticket_btn").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("notify_staff").setEmoji("🔔").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("add_member").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("change_color").setEmoji("🎨").setStyle(ButtonStyle.Secondary)
            );

            const embed = new EmbedBuilder()
                .setColor("#d3a35a")
                .setDescription(`${config.welcomeMessage || "مرحباً بك، يرجى كتابة طلبك."} <@${interaction.user.id}>`);

            await channel.send({ 
                content: `نوع التذكرة : ${interaction.values[0]}`,
                embeds: [embed], 
                components: [row] 
            });

            await interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}` });
        }

        // 2. معالجة الأزرار (إغلاق التذكرة)
        if (interaction.isButton() && interaction.customId === 'close_ticket_btn') {
            // استدعاء ملف close.js المنظم
            const fakeMessage = {
                guild: interaction.guild,
                channel: interaction.channel,
                author: interaction.user,
                member: interaction.member,
                reply: (c) => interaction.reply(c),
                react: (e) => interaction.channel.send(e)
            };
            
            // تحديث MongoDB قبل الحذف للسماح بفتح تذكرة جديدة
            let config = await TicketSchema.findOne({ guildId });
            if (config) {
                for (let [userId, chId] of config.openTickets) {
                    if (chId === interaction.channel.id) {
                        config.openTickets.delete(userId);
                        break;
                    }
                }
                await config.save();
            }

            await closeCommand.run(client, fakeMessage);
        }

    } catch (error) {
        console.error("Interaction Error:", error);
    }
};
