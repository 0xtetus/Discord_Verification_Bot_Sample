//index.js//

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_PRESENCES] });
const config = require("./config/config.json");

//Libs imports
const { CommandsLoader } = require("./components/CommandsLoader.js");
const { VerificationManager } = require("./components/VerificationManager.js");


(async () => {
    let ig;
    if(config.back_end_checks) {
        const {IgApiClient} = require("instagram-private-api");
        ig = new IgApiClient();

        ig.state.generateDevice(config.instagram.username);
        await ig.simulate.preLoginFlow();
        console.log("login to ig acc")
        await ig.account.login(config.instagram.username, config.instagram.password);
    } else {
        ig = null
    }

    await client.login(config.discord.token);

    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        new CommandsLoader(client, [VerificationManager]).loadCommands();
    });

    client.on(`interactionCreate`, (interaction) => {
        new VerificationManager(interaction, client, config, ig).on();
    });
})();

