const http = require('http');
const mongoose = require('mongoose');
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const db = require("pro.db");
const config = require("./config.json");

// 1. السيرفر الوهمي (حل مشكلة Port Scan Timeout في Render)
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
  res.write('البوت شغال ومتصل بالسيرفر ✅'); 
  res.end();
}).listen(process.env.PORT || 8080);

console.log("✅ السيرفر الوهمي جاهز لمراقبة UptimeRobot");

// 2. الربط مع MongoDB
// نصيحة: بعد التأكد من عمله، يفضل وضع هذا الرابط في ملف config.json أو متغيرات البيئة
const mongoURI = "mongodb+srv://mroan19899_db_user:gMt56zIvireFe0tg@cluster0.d39lidi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
  .then(() => console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح!'))
  .catch(err => console.error('❌ خطأ في اتصال MongoDB:', err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent, 
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 3. نظام منع الانهيار (Anti-Crash)
process.on('unhandledRejection', (reason, p) => {
    console.log(' [Anti-crash] Unhandled Rejection');
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [Anti-crash] Uncaught Exception');
    console.log(err, origin);
});

client.commands = new Collection();
client.aliases = new Collection();

// 4. تحميل الأوامر
const commandsPath = path.join(__dirname, "Commands");
if (fs.existsSync(commandsPath)) {
    const cats = fs.readdirSync(commandsPath);
    for (const cat of cats) {
      const catPath = path.join(commandsPath, cat);
      if (!fs.lstatSync(catPath).isDirectory()) continue;
      const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));

      for (const file of files) {
        const cmdPath = path.join(catPath, file);
        try {
          const cmd = require(cmdPath);
          if (!cmd || !cmd.name) continue;
          client.commands.set(cmd.name.toLowerCase(), cmd);
          if (Array.isArray(cmd.aliases)) {
            cmd.aliases.forEach((al) => {
              client.aliases.set(al.toLowerCase(), cmd.name.toLowerCase());
            });
          }
          console.log(`✅ Loaded command: ${cat}/${cmd.name}`);
        } catch (err) {
          console.error(`❌ Failed to load ${file}:`, err);
        }
      }
    }
}

// 5. تحميل الأحداث (Events)
const eventsRoot = path.join(__dirname, "events");
if (fs.existsSync(eventsRoot)) {
    fs.readdirSync(eventsRoot).forEach((folder) => {
      const fullFolder = path.join(eventsRoot, folder);
      if (!fs.lstatSync(fullFolder).isDirectory()) return;
      const eventFiles = fs.readdirSync(fullFolder).filter((f) => f.endsWith(".js"));

      for (const file of eventFiles) {
        const evPath = path.join(fullFolder, file);
        const eventName = file.split(".")[0];
        try {
          const eventFn = require(evPath);
          if (eventName === "ready") {
            client.once("ready", (...args) => eventFn(client, ...args));
          } else {
            client.on(eventName, (...args) => eventFn(client, ...args));
          }
          console.log(`⚡ Loaded event: ${folder}/${file}`);
        } catch (err) {
          console.error(`❌ Event load error in ${file}:`, err);
        }
      }
    });
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(config.token);
