//CommandsLoader.js//

class CommandsLoader{
    constructor(client, modules) {
        this.client = client;
        this.modules = modules
    }

    loadCommands() {
        let guild = this.client.guilds.cache.get("0000000000000000000000");

        let modules = [];

        this.modules.forEach((e) => {
            modules.push(
                new e(null, null, null).loadCommands()
            )
        })

        if(guild) {
            for(const e of modules) {
                for(const i of e) {
                    guild.commands.create(
                        i
                    ).then().catch(console.error);
                }
            }
        }
    }
}

module.exports = {
    CommandsLoader
}