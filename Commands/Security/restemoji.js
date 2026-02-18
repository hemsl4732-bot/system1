// Commands/Owner/restemoji.js - Discord.js v14
const fs = require("fs");
const path = require("path");
const { owners } = require(`${process.cwd()}/config`);

const emojiFolder = path.join(process.cwd(), "Saved", "aemoji");

// يحوّل الامتداد لوسيط نوع صورة صحيح (png/jpg/jpeg/gif/webp)
function normalizeExt(ext) {
  const e = (ext || "").toLowerCase();
  if (e === "jpg") return "jpeg";
  if (["png", "jpeg", "gif", "webp"].includes(e)) return e;
  return null;
}

module.exports = {
  name: "manageemojis",
  aliases: ["restemoji"],
  description: "استعادة/إضافة الإيموجيات المخزنة في Saved/aemoji إلى السيرفر",
  run: async (client, message) => {
    if (!message.guild) return;

    // السماح: ملاك البوت فقط
    if (!owners.includes(message.author.id)) return message.react("❌");

    // التأكد من وجود المجلد
    if (!fs.existsSync(emojiFolder)) {
      await message.reply("❌ لم يتم العثور على مجلد الإيموجيات: `Saved/aemoji`.");
      return;
    }

    const files = fs.readdirSync(emojiFolder).filter((f) => !f.startsWith("."));
    if (!files.length) return message.react("❌");

    // حساب الزمن التقديري (3 ثواني/إيموجي كما في كودك)
    const total = files.length;
    const estimatedSeconds = total * 3;
    const min = Math.floor(estimatedSeconds / 60);
    const sec = estimatedSeconds % 60;
    const formatted = `(\`${min}:${sec.toString().padStart(2, "0")}\`)`;

    const statusMsg = await message.channel.send(
      `سيتم إضافة **${total}** إيموجي. سيستغرق هذا ${formatted} دقيقة تقريبًا…`
    );

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const fileName of files) {
      try {
        const parts = fileName.split(".");
        const baseName = parts.slice(0, -1).join("."); // يدعم أسماء فيها نقاط
        const ext = normalizeExt(parts.pop());

        if (!baseName || !ext) {
          skipped++;
          continue;
        }

        // هل الاسم موجود بالفعل؟
        const exists = message.guild.emojis.cache.find((e) => e.name === baseName);
        if (exists) {
          skipped++;
          continue;
        }

        const filePath = path.join(emojiFolder, fileName);
        const buf = fs.readFileSync(filePath);
        const dataURI = `data:image/${ext};base64,${buf.toString("base64")}`;

        // v14: create({ name, image })
        await message.guild.emojis.create({ name: baseName, image: dataURI });

        created++;

        // تحديث تقدّم بسيط كل عدة عناصر لتفادي السبام
        if ((created + skipped + failed) % 5 === 0 || created === total) {
          await statusMsg.edit(
            `يتم الآن الإضافة… ✅ مضاف: **${created}** | ⏭️ متجاوز: **${skipped}** | ⚠️ فشل: **${failed}** / **${total}**`
          ).catch(() => {});
        }

        // مهلة بسيطة لتخفيف الضغط (كما في كودك: ~3 ثوانٍ)
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        console.error("Emoji create error:", err);
        failed++;
        // حدث تحديث دوري للحالة
        if ((created + skipped + failed) % 5 === 0) {
          await statusMsg.edit(
            `يتم الآن الإضافة… ✅ مضاف: **${created}** | ⏭️ متجاوز: **${skipped}** | ⚠️ فشل: **${failed}** / **${total}**`
          ).catch(() => {});
        }
      }
    }

    await statusMsg.edit(
      `انتهيت! ✅ تمت إضافة: **${created}** | ⏭️ تم تجاوز الموجود: **${skipped}** | ⚠️ فشل: **${failed}** من أصل **${total}**.`
    ).catch(() => {});

    // رد مختصر بالإيموجي كعلامة نجاح عامة
    message.react(created > 0 && failed === 0 ? "✅" : "☑️").catch(() => {});
  },
};
