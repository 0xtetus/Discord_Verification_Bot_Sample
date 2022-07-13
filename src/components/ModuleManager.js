//ModuleManager.js//

const { MessageEmbed } = require("discord.js");

class ModuleManager{
    constructor(client, config) {
        this.client = client;
        this.config = config;
    }

    error(interaction, message) {
        interaction.reply(
            {
                ephemeral: true,
                embeds: [
                    new MessageEmbed()
                        .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                        .setDescription(message)
                        .setTimestamp()
                        .setColor("#FF0000")
                        .setFooter({text: interaction.guild.name, iconURL: interaction.guild.iconURL()})
                ]
            }
        )
    }

    getDaysInCurrentMonth(month) {
        const date = new Date(month);

        return new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        ).getDate();
    }

    getDateMs(date) {
        let aDate = date.slice().split(/ /);
        if(aDate.length === 2) {
            let date1 = aDate[0].slice().split("/");
            let date2 = aDate[1].slice().split(":");

            return new Date(parseInt(date1[2]), parseInt(date1[1] - 1), parseInt(date1[0]), parseInt(date2[0]), parseInt(date2[1])).getTime();
        } else {
            return 0;
        }
    }

    getTimeMs(time) {
        let format = time.slice().split(":");

        let hours = parseFloat(format[0]) * 3600;
        let minutes = parseFloat(format[1]) * 60;
        let seconds = parseFloat(format[2]);

        return hours+minutes+seconds;
    }

    parseForSql(text) {
        let cText = text;
        for(let i = 0; text.length > i; i++) {
            cText = cText.replace('"', "");
        }
        return cText;
    }

    date(time) {
        let date = new Date(parseInt(time));

        let month = (date.getMonth()+1) >= 9 ? (date.getMonth()+1) : "0" + (date.getMonth()+1);
        let day = (date.getDate()) >= 9 ? date.getDate() : "0" + date.getDate();
        let hour = (date.getHours()) >= 9 ? date.getHours() : "0" + date.getHours();
        let minute = (date.getMinutes()) >= 9 ? date.getMinutes() : "0" + date.getMinutes()
        return `${day}/${month}/${date.getFullYear()}`
    }

}

module.exports = {
    ModuleManager
}