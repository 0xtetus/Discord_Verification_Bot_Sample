//VerificationManager.js//

const { MessageEmbed, MessageButton, MessageActionRow, MessageSelectMenu, MessageAttachment, User} = require("discord.js");
const { ModuleManager } = require("./ModuleManager.js");
const { IgApiClient, Feed, UserFeed} = require("instagram-private-api");
const fs = require("fs");
const needle = require("needle");
const twitter = require('twitter-lite');
const { google } = require("googleapis");
const data = require("../database/data.json");

let Cache = [];

class VerificationManager {
    constructor(interaction = null, client = null, config = null, ig = null) {
        this.interaction = interaction;
        this.client = client;
        this.config = config;
        this.mm = new ModuleManager(client, config);

        if (config !== null) {
            this.twitterClient =  new twitter({
                subdomain: "api", //
                version: "1.1",
                consumer_key: this.config.twitter.consumer_key,
                consumer_secret: this.config.twitter.consumer_secret,
                access_token_key: this.config.twitter.access_token_key,
                access_token_secret: this.config.twitter.access_secret_token
            });

            this.ig = ig;
        }
    }

    loadCommands() {
        return [
            {
                name: "verifyme",
                description: "A simple command to verify yourself!",
                options: []
            }
        ]
    }

    async on() {
        if(this.interaction.isCommand()) {
            if(this.interaction.command !== null) {
                switch (this.interaction.command.name) {
                    case "verifyme":
                        Cache.push(
                            {
                                id: this.interaction.member.user.id,
                                instagram: null,
                                twitter: null,
                                youtube: null
                            }
                        )

                        await this.interaction.reply(
                            {
                                ephemeral: true,
                                embeds: [
                                    new MessageEmbed()
                                        .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                                        .setColor("BLUE")
                                        .setDescription(`Hey ${this.interaction.member}, I messaged you in DM. Please complete the form to get verified!`)
                                        .setThumbnail(this.interaction.member.user.avatarURL())
                                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                        .setTimestamp()
                                ]
                            }
                        ).then().catch(console.error);

                        await this.startVerification();

                        break;
                }
            }
        }
    }

    async giveRole() {
        await this.interaction.member.send(
            {
                embeds: [
                    new MessageEmbed()
                        .setAuthor({name: this.interaction.member.user.username, iconURL: this.interaction.member.user.avatarURL()})
                        .setColor("GREEN")
                        .setDescription(`Hey ${this.interaction.member}, You successfully passed the verification process. You've been awarded a verified role!`)
                        .setTimestamp()
                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                ]
            }
        ).then().catch(console.error);

        await this.interaction.member.roles.add(this.config.verified_role_id).then().catch(console.error);
    }

    async saveToJson() {
        let data = require("../database/data.json");

        if(!data.verified.some(fn => fn.id === this.interaction.member.user.id)) {
            data.verified.push(
                Cache.find(fn => fn.id === this.interaction.member.user.id)
            );

            fs.writeFileSync(`./database/data.json`, JSON.stringify(data));
        } else {
            fs.writeFileSync(`./database/data.json`, JSON.stringify(data));
        }
    }

    async startVerification() {
        if(await this.passwordChecks()) {
            await this.twitterVerification();

            if(this.config.back_end_checks) {
                await this.instagramApiVerification();
                await this.youtubeApiVerification();
            } else {
                await this.instagramFakeBackend();
                await this.youtubeFakeVerification()
            }

            await this.giveRole();

            await this.saveToJson();
        } else {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                            .setColor("RED")
                            .setDescription(`Hey ${this.interaction.member}, The verification code you typed is wrong. Please retry with the right one.`)
                            .setThumbnail(this.interaction.member.user.avatarURL())
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            .setTimestamp()
                    ]
                }
            ).then().catch(console.error);
        }
    }

    async passwordChecks() {
        let inputPswd = "";

        await this.interaction.member.send(
            {
                embeds: [
                    new MessageEmbed()
                        .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                        .setColor("BLUE")
                        .setDescription(`Hey ${this.interaction.member}, Please Type here the verification code!`)
                        .setThumbnail(this.interaction.member.user.avatarURL())
                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                        .setTimestamp()
                ]
            }
        ).then(async (message) => {
            const filter = m => m.author.id === this.interaction.member.user.id;
            await message.channel.awaitMessages(
                {
                    filter,
                    max: 1,
                    time: 60000,
                    errors: ["time"]
                }
            ).then(async (collected) => {
                inputPswd = collected.first().content;
            }).catch(console.error);
        }).catch(console.error);

        return inputPswd === this.config.password;
    }

    async twitterVerification() {
        let cache = {
            userTwitterScreenName: null
        }
        await this.interaction.member.send(
            {
                embeds: [
                    new MessageEmbed()
                        .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                        .setColor("BLUE")
                        .setDescription(`Hey ${this.interaction.member}, You started the verification process. Please complete all of these requests!`)
                        .setThumbnail(this.interaction.member.user.avatarURL())
                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                        .setTimestamp()
                ]
            }
        ).then().catch(console.error);

        let questions = [
            {
                q: `Please type here your twitter username.`,
                val: "- Please make sure that you're typing the @twitter-username."
            }
        ]

        for(let i = 0; questions.length > i; i++) {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: questions[i].q,
                                    value: questions[i].val
                                }
                            )
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            .setTimestamp()
                    ],
                }
            ).then(async message => {
                const filter2 = m => m.author.id === this.interaction.member.user.id;
                await message.channel.awaitMessages(
                    {
                        filter2,
                        max: 1,
                        time: 60000,
                        errors: ["time"]
                    }
                ).then(async (collected) => {
                    console.log(Cache)

                    Cache.find(fn => fn.id === this.interaction.member.user.id).twitter = collected.first().content;

                    console.log(Cache)

                    let pass = false;

                    try{
                        let useLookup = await this.twitterClient.get("users/lookup", {screen_name: collected.first().content});
                        pass = true
                    } catch (e) {

                    }

                    if(pass) {
                        cache.userTwitterScreenName = collected.first().content;

                        await message.edit(
                            {
                                embeds: [
                                    new MessageEmbed()
                                        .setColor("GREEN")
                                        .addFields(
                                            {
                                                name: questions[i].q,
                                                value: "- **" + collected.first().content + "**"
                                            }
                                        )
                                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                        .setTimestamp()
                                ]
                            }
                        ).then().catch(console.error)
                    } else {
                        await message.edit(
                            {
                                embeds: [
                                    new MessageEmbed()
                                        .setColor("RED")
                                        .addFields(
                                            {
                                                name: questions[i].q,
                                                value: "**" + questions[i].val + "**"
                                            }
                                        )
                                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                        .setTimestamp()
                                ]
                            }
                        ).then().catch(console.error)
                        i--
                    }
                }).catch(console.error);
            }).catch(console.error);
        }
        await this.interaction.member.send(
            {
                embeds: [
                    new MessageEmbed()
                        .setAuthor({name: this.client.user.username, iconURL: this.client.user.avatarURL()})
                        .setColor("BLUE")
                        .setDescription(`Amazing ${this.interaction.member}, Now please follow each of the twitter account that i will be providing!`)
                        .setThumbnail(this.interaction.member.user.avatarURL())
                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                        .setTimestamp()
                ]
            }
        ).then(async (Message) => {
            for (let i = 0; this.config.accounts.twitter.length > i; i++) {
                let UserLookup = await this.twitterClient.get("users/lookup", {screen_name: this.config.accounts.twitter[i].screen_name});

                await this.interaction.member.send(
                    {
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({name: UserLookup[0].name, iconURL: UserLookup[0].profile_image_url})
                                .setDescription(UserLookup[0].description)
                                .setColor("BLUE")
                                .addFields(
                                    {
                                        name: `Follow Status:`,
                                        value: `- Waiting`
                                    }
                                )
                                .setFooter({
                                    text: "Twitter",
                                    iconURL: "https://img.icons8.com/color/48/000000/twitter--v1.png"
                                })
                        ],
                        components: [
                            new MessageActionRow()
                                .addComponents(
                                    new MessageButton()
                                        .setStyle("LINK")
                                        .setLabel("Link")
                                        .setURL(`https://twitter.com/${this.config.accounts.twitter[i].screen_name}`)
                                )
                                .addComponents(
                                    new MessageButton()
                                        .setStyle("SUCCESS")
                                        .setLabel(`Followed`)
                                        .setCustomId("followed")
                                )
                        ]
                    }
                ).then(async message => {
                    const filter2 = (i) => i.user.id === this.interaction.member.user.id;
                    await message.awaitMessageComponent(
                        {
                            filter2,
                            time: 60000
                        }
                    ).then(async interaction => {
                        await interaction.deferUpdate();
                        switch (interaction.customId) {
                            case `followed`:
                                let Friends = await this.twitterClient.get("friendships/show", {
                                    source_screen_name: cache.userTwitterScreenName,
                                    target_screen_name: this.config.accounts.twitter[i].screen_name
                                });

                                if (Friends.relationship.source.following) {
                                    await message.edit(
                                        {
                                            embeds: [
                                                new MessageEmbed()
                                                    .setAuthor({
                                                        name: UserLookup[0].name,
                                                        iconURL: UserLookup[0].profile_image_url
                                                    })
                                                    .setDescription(UserLookup[0].description)
                                                    .setColor("GREEN")
                                                    .addFields(
                                                        {
                                                            name: `Follow Status:`,
                                                            value: `- Followed.`
                                                        }
                                                    )
                                                    .setFooter({
                                                        text: "Twitter",
                                                        iconURL: "https://img.icons8.com/color/48/000000/twitter--v1.png"
                                                    })
                                            ],
                                            components: []
                                        }
                                    )
                                } else {
                                    await message.edit(
                                        {
                                            embeds: [
                                                new MessageEmbed()
                                                    .setAuthor({
                                                        name: UserLookup[0].name,
                                                        iconURL: UserLookup[0].profile_image_url
                                                    })
                                                    .setDescription(UserLookup[0].description)
                                                    .setColor("RED")
                                                    .addFields(
                                                        {
                                                            name: `Follow Status:`,
                                                            value: `- Not followed, Please follow this account in order to get verified.`
                                                        }
                                                    )
                                                    .setFooter({
                                                        text: "Twitter",
                                                        iconURL: "https://img.icons8.com/color/48/000000/twitter--v1.png"
                                                    })
                                            ],
                                            components: []
                                        }
                                    )
                                    i--
                                }
                                break;
                        }
                    }).catch(console.error);
                }).catch(console.error);
            }
        }).then().catch(console.error);
    }

    async instagramApiVerification() {
        let username;
        let questions = [
            {
                q: `Please type here your instagram username.`,
                val: "- Please make sure that you're typing the @instagram-username."
            }
        ]
        for(let i = 0; questions.length > i; i++) {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: questions[i].q,
                                    value: questions[i].val
                                }
                            )
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            .setTimestamp()
                    ],
                }
            ).then(async message => {
                const filter2 = m => m.author.id === this.interaction.member.user.id;
                await message.channel.awaitMessages(
                    {
                        filter2,
                        max: 1,
                        time: 60000,
                        errors: ["time"]
                    }
                ).then(async (collected) => {
                    username = collected.first().content;
                    Cache.find(fn => fn.id === this.interaction.member.user.id).instagram = collected.first().content;

                }).catch(console.error);
            }).catch(console.error);
        }

        for(let i = 0; this.config.accounts.instagram.length > i; i++) {
            let user = await this.ig.search.users(this.config.accounts.instagram[i].screen_name);
            let userProfile = this.ig.feed.user(user[0].pk);
            userProfile = await userProfile.items();
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({name: userProfile[0].user.username, iconURL: userProfile[0].user.profile_pic_url})
                            .setDescription(`Please follow this instagram account.`)
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: `Follow Status:`,
                                    value: `- Waiting.`
                                }
                            )
                            .setFooter({text: "Instagram", iconURL: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"})
                    ],
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setStyle("LINK")
                                    .setLabel("Link")
                                    .setURL(`https://www.instagram.com/${this.config.accounts.instagram[i].screen_name}/`)
                            )
                            .addComponents(
                                new MessageButton()
                                    .setStyle("SUCCESS")
                                    .setLabel(`Followed`)
                                    .setCustomId("followed")
                            )
                    ]
                }
            ).then(async (Message) => {
                const filter2 = (i) => i.user.id === this.interaction.member.user.id;
                await Message.awaitMessageComponent(
                    {
                        filter2,
                        time: 60000
                    }
                ).then(async interaction => {
                    await interaction.deferUpdate();
                    switch (interaction.customId) {
                        case `followed`:
                            let userFeed = this.ig.feed.accountFollowers(user[0].pk);
                            let followers = await userFeed.items()

                            if(followers.some(fn => fn.username === username)) {
                                await Message.edit(
                                    {
                                        embeds: [
                                            new MessageEmbed()
                                                .setAuthor({name: userProfile[0].user.username, iconURL: userProfile[0].user.profile_pic_url})
                                                .setDescription(`Please follow this instagram account.`)
                                                .setColor("GREEN")
                                                .addFields(
                                                    {
                                                        name: `Follow Status:`,
                                                        value: `- Followed.`
                                                    }
                                                )
                                                .setFooter({text: "Instagram", iconURL: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"})
                                        ],
                                        components: []
                                    }
                                ).then().catch(console.error);
                            } else {
                                await Message.edit(
                                    {
                                        embeds: [
                                            new MessageEmbed()
                                                .setAuthor({name: userProfile[0].user.username, iconURL: userProfile[0].user.profile_pic_url})
                                                .setDescription(`Please follow this instagram account.`)
                                                .setColor("RED")
                                                .addFields(
                                                    {
                                                        name: `Follow Status:`,
                                                        value: `- Waiting.`
                                                    }
                                                )
                                                .setFooter({text: "Instagram", iconURL: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"})
                                        ],
                                        components: []
                                    }
                                ).then().catch(console.error);
                                i--
                            }
                            break;
                    }
                }).catch(console.error);
            }).catch(console.error);
        }
    }

    async instagramFakeBackend() {
        let username;
        let questions = [
            {
                q: `Please type here your instagram username.`,
                val: "- Please make sure that you're typing the @instagram-username."
            }
        ]
        for(let i = 0; questions.length > i; i++) {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: questions[i].q,
                                    value: questions[i].val
                                }
                            )
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            .setTimestamp()
                    ],
                }
            ).then(async message => {
                const filter2 = m => m.author.id === this.interaction.member.user.id;
                await message.channel.awaitMessages(
                    {
                        filter2,
                        max: 1,
                        time: 60000,
                        errors: ["time"]
                    }
                ).then(async (collected) => {
                    username = collected.first().content;
                    Cache.find(fn => fn.id === this.interaction.member.user.id).instagram = collected.first().content;
                }).catch(console.error);
            }).catch(console.error);
        }


        for(let i = 0; this.config.accounts.instagram.length > i; i++) {

            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({name: this.config.accounts.instagram[i].screen_name, iconURL: "https://scontent-cdt1-1.cdninstagram.com/v/t51.2885-19/50115197_943541335838010_3070917147241742336_n.jpg?stp=dst-jpg_s150x150&_nc_ht=scontent-cdt1-1.cdninstagram.com&_nc_cat=106&_nc_ohc=7bQlx2QJeTQAX99n1oG&edm=APU89FABAAAA&ccb=7-5&oh=00_AT8YoaBaoKV6k8Gx6X9qAIrwQAejnUFhtFqgiZfZxfzeBw&oe=629F5AA0&_nc_sid=86f79a"})
                            .setDescription(`Please follow this instagram account.`)
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: `Follow Status:`,
                                    value: `- Waiting.`
                                }
                            )
                            .setFooter({text: "Instagram", iconURL: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"})
                    ],
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setStyle("LINK")
                                    .setLabel("Link")
                                    .setURL(`https://www.instagram.com/${this.config.accounts.instagram[i].screen_name}/`)
                            )
                            .addComponents(
                                new MessageButton()
                                    .setStyle("SUCCESS")
                                    .setLabel(`Followed`)
                                    .setCustomId("followed")
                            )
                    ]
                }
            ).then(async (Message) => {
                const filter2 = (i) => i.user.id === this.interaction.member.user.id;
                await Message.awaitMessageComponent(
                    {
                        filter2,
                        time: 60000
                    }
                ).then(async interaction => {
                    await interaction.deferUpdate();
                    switch (interaction.customId) {
                        case `followed`:
                            await Message.edit(
                                {
                                    embeds: [
                                        new MessageEmbed()
                                            .setAuthor({name: this.config.accounts.instagram[i].screen_name, iconURL: "https://scontent-cdt1-1.cdninstagram.com/v/t51.2885-19/50115197_943541335838010_3070917147241742336_n.jpg?stp=dst-jpg_s150x150&_nc_ht=scontent-cdt1-1.cdninstagram.com&_nc_cat=106&_nc_ohc=7bQlx2QJeTQAX99n1oG&edm=APU89FABAAAA&ccb=7-5&oh=00_AT8YoaBaoKV6k8Gx6X9qAIrwQAejnUFhtFqgiZfZxfzeBw&oe=629F5AA0&_nc_sid=86f79a"})
                                            .setDescription(`Please follow this instagram account.`)
                                            .setColor("GREEN")
                                            .addFields(
                                                {
                                                    name: `Follow Status:`,
                                                    value: `- Followed.`
                                                }
                                            )
                                            .setFooter({text: "Instagram", iconURL: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"})
                                    ],
                                    components: []
                                }
                            ).then().catch(console.error);
                            break;
                    }
                }).catch(console.error);
            }).catch(console.error);
        }
    }

    async youtubeApiVerification() {
        let youtube = google.youtube("v3")

        let cache = {
            youtubeUsername: null
        }

        let questions = [
            {
                q: `Please copy and past here your youtube id/username.`,
                val: "- In order to get the right data we need, follow the image below."
            }
        ]

        for(let i = 0; questions.length > i; i++) {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setColor("BLUE")
                            .addFields(
                                {
                                    name: questions[i].q,
                                    value: questions[i].val
                                }
                            )
                            .setImage("https://i.imgur.com/STQKGuH.png")
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            .setTimestamp()
                    ],
                }
            ).then(async message => {
                const filter2 = m => m.author.id === this.interaction.member.user.id;
                await message.channel.awaitMessages(
                    {
                        filter2,
                        max: 1,
                        time: 60000,
                        errors: ["time"]
                    }
                ).then(async (collected) => {
                    cache.youtubeUsername = collected.first().content;
                    Cache.find(fn => fn.id === this.interaction.member.user.id).youtube = collected.first().content;

                    let pass = false;

                    await youtube.channels.list(
                        {
                            key: this.config.youtube.apiKey,
                            part: "snippet",
                            id: cache.youtubeUsername
                        }
                    ).then(async (res) => {
                        if(res.status === 200) {
                            pass = true;
                        }

                        if(pass) {
                            await message.edit(
                                {
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor("GREEN")
                                            .addFields(
                                                {
                                                    name: questions[i].q,
                                                    value: "- **" + collected.first().content + "**"
                                                }
                                            )
                                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                            .setTimestamp()
                                    ]
                                }
                            ).then().catch(console.error)
                        } else {
                            await message.edit(
                                {
                                    embeds: [
                                        new MessageEmbed()
                                            .setColor("RED")
                                            .addFields(
                                                {
                                                    name: questions[i].q,
                                                    value: "- **" + collected.first().content + "**"
                                                }
                                            )
                                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                            .setTimestamp()
                                    ]
                                }
                            ).then().catch(console.error)
                            i--
                        }
                    }).catch(console.error);
                }).catch(console.error);
            }).catch(console.error);
        }
        for(let i = 0; this.config.accounts.youtube.length > i; i++) {
            await needle("post", "https://www.googleapis.com/oauth2/v4/token",
                {
                    client_id: this.config.youtube.myClientId,
                    client_secret: this.config.youtube.myClientSecret,
                    refresh_token: this.config.youtube.myToken,
                    grant_type: "refresh_token"
                }
            ).then(async (res) => {
                let token = res.body.access_token;

                await youtube.channels.list(
                    {
                        key: this.config.youtube.apiKey,
                        part: "snippet",
                        id: "UCP5nYWTLsAd9TAt8MIE5pLg",
                        access_token: token,
                    }
                ).then(async (res) => {
                    let channelData = res.data.items[0].snippet;

                    await this.interaction.member.send(
                        {
                            embeds: [
                                new MessageEmbed()
                                    .setAuthor({name: channelData.title, iconURL: channelData.thumbnails.medium.url})
                                    .addFields(
                                        {
                                            name: "Description:",
                                            value: channelData.description,
                                            inline: false,
                                        },
                                        {
                                            name: "Subscription Status:",
                                            value: "- Waiting",
                                            inline: false
                                        }
                                    )
                                    .setColor("BLUE")
                                    .setTimestamp()
                                    .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                            ],
                            components: [
                                new MessageActionRow()
                                    .addComponents(
                                        new MessageButton()
                                            .setLabel("Link")
                                            .setStyle("LINK")
                                            .setURL("https://www.youtube.com/user/monoclemagazine/featured")
                                    )
                                    .addComponents(
                                        new MessageButton()
                                            .setLabel("Subscribed")
                                            .setStyle("SUCCESS")
                                            .setCustomId("subscribed")
                                    )
                            ]
                        }
                    ).then(async (message) => {
                        const filter2 = (i) => i.user.id === this.interaction.member.user.id;
                        await message.awaitMessageComponent(
                            {
                                filter2,
                                time: 60000
                            }
                        ).then(async interaction => {
                            await interaction.deferUpdate();

                            youtube.subscriptions.list(
                                {
                                    key: this.config.youtube.apiKey,
                                    access_token: token,
                                    part: "subscriberSnippet",
                                    mySubscribers: true,
                                    maxResults: 50,
                                }
                            ).then(async (res) => {
                                const { data } = res;
                                let pass = false;

                                data.items.forEach((items) => {
                                    if(items.subscriberSnippet.channelId === cache.youtubeUsername) {
                                        pass = true;
                                    }
                                });

                                if(this.config.force_sub === false) {
                                    pass = true;
                                }

                                if(pass) {
                                    await message.edit(
                                        {
                                            embeds: [
                                                new MessageEmbed()
                                                    .setAuthor({name: channelData.title, iconURL: channelData.thumbnails.medium.url})
                                                    .addFields(
                                                        {
                                                            name: "Description:",
                                                            value: channelData.description,
                                                            inline: false,
                                                        },
                                                        {
                                                            name: "Subscription Status:",
                                                            value: "- Subscribed",
                                                            inline: false
                                                        }
                                                    )
                                                    .setColor("GREEN")
                                                    .setTimestamp()
                                                    .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                            ],
                                            components: [
                                                new MessageActionRow()
                                                    .addComponents(
                                                        new MessageButton()
                                                            .setLabel("Link")
                                                            .setStyle("LINK")
                                                            .setURL("https://www.youtube.com/user/monoclemagazine/featured")
                                                    )
                                                    .addComponents(
                                                        new MessageButton()
                                                            .setLabel("Subscribed")
                                                            .setStyle("SUCCESS")
                                                            .setCustomId("subscribed")
                                                    )
                                            ]
                                        }
                                    ).then().catch(console.error);
                                } else {
                                    await message.edit(
                                        {
                                            embeds: [
                                                new MessageEmbed()
                                                    .setAuthor({name: channelData.title, iconURL: channelData.thumbnails.medium.url})
                                                    .addFields(
                                                        {
                                                            name: "Description:",
                                                            value: channelData.description,
                                                            inline: false,
                                                        },
                                                        {
                                                            name: "Subscription Status:",
                                                            value: "- Waiting",
                                                            inline: false
                                                        }
                                                    )
                                                    .setColor("RED")
                                                    .setTimestamp()
                                                    .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                            ],
                                            components: [
                                                new MessageActionRow()
                                                    .addComponents(
                                                        new MessageButton()
                                                            .setLabel("Link")
                                                            .setStyle("LINK")
                                                            .setURL("https://www.youtube.com/user/monoclemagazine/featured")
                                                    )
                                                    .addComponents(
                                                        new MessageButton()
                                                            .setLabel("Subscribed")
                                                            .setStyle("SUCCESS")
                                                            .setCustomId("subscribed")
                                                    )
                                            ]
                                        }
                                    ).then().catch(console.error);
                                    i--
                                }
                            }).catch((err) => {
                                throw err;
                            });
                        }).catch(console.error);
                    }).catch(console.error)
                }).catch(console.error);
            }).catch(console.error)
        }
    }

    async youtubeFakeVerification() {
        const wait=ms=>new Promise(resolve => setTimeout(resolve, ms));

        for(let i = 0; this.config.accounts.youtube.length > i; i++) {
            await this.interaction.member.send(
                {
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({name: "Monocle Films", iconURL: "https://yt3.ggpht.com/Cpy9tlsukBZg-sOpbJrDRaPpEhVXVRt-h1hNwVt1qylzlsAjwKPAQG9W5nHRormwpuKQ7Im5_w=s88-c-k-c0x00ffffff-no-rj"})
                            .addFields(
                                {
                                    name: "Description:",
                                    value: "Monocle is a leading media brand and publisher, with a globally respected print magazine that tells fresh stories from around the world in print, audio and online, and through our daily newsletters, films and lively events. Since 2007 we’ve become a leading voice and authority on everything from soft power to quality of life, design, entrepreneurship, urbanism, travel and culture. With an extensive network of correspondents in key cities and bureaux across three continents, we believe in the power of having reporters on the ground and sending photographers and film-makers on assignment. We also believe in committing great journalism, analysis and ideas to print. Monocle publishes books, travel guides, seasonal newspapers and runs a series of successful shops and cafés. For more, head to monocle.com/about.",
                                    inline: false,
                                },
                                {
                                    name: "Subscription Status:",
                                    value: "- Waiting",
                                    inline: false
                                }
                            )
                            .setColor("BLUE")
                            .setTimestamp()
                            .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                    ],
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setLabel("Link")
                                    .setStyle("LINK")
                                    .setURL("https://www.youtube.com/user/monoclemagazine/featured")
                            )
                    ]
                }
            ).then(async (message) => {
                await wait(5000).then().catch(console.error);

                await message.edit(
                    {
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({name: "Monocle Films", iconURL: "https://yt3.ggpht.com/Cpy9tlsukBZg-sOpbJrDRaPpEhVXVRt-h1hNwVt1qylzlsAjwKPAQG9W5nHRormwpuKQ7Im5_w=s88-c-k-c0x00ffffff-no-rj"})
                                .addFields(
                                    {
                                        name: "Description:",
                                        value: "Monocle is a leading media brand and publisher, with a globally respected print magazine that tells fresh stories from around the world in print, audio and online, and through our daily newsletters, films and lively events. Since 2007 we’ve become a leading voice and authority on everything from soft power to quality of life, design, entrepreneurship, urbanism, travel and culture. With an extensive network of correspondents in key cities and bureaux across three continents, we believe in the power of having reporters on the ground and sending photographers and film-makers on assignment. We also believe in committing great journalism, analysis and ideas to print. Monocle publishes books, travel guides, seasonal newspapers and runs a series of successful shops and cafés. For more, head to monocle.com/about.",
                                        inline: false,
                                    },
                                    {
                                        name: "Subscription Status:",
                                        value: "- Waiting",
                                        inline: false
                                    }
                                )
                                .setColor("BLUE")
                                .setTimestamp()
                                .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                        ],
                        components: [
                            new MessageActionRow()
                                .addComponents(
                                    new MessageButton()
                                        .setLabel("Link")
                                        .setStyle("LINK")
                                        .setURL("https://www.youtube.com/user/monoclemagazine/featured")
                                )
                                .addComponents(
                                    new MessageButton()
                                        .setLabel("Subscribed")
                                        .setStyle("SUCCESS")
                                        .setCustomId("subscribed")
                                )
                        ]
                    }
                ).then(async (Message) => {
                    const filter2 = (i) => i.user.id === this.interaction.member.user.id;
                    await Message.awaitMessageComponent(
                        {
                            filter2,
                            time: 60000
                        }
                    ).then(async interaction => {
                        await interaction.deferUpdate();

                        await Message.edit(
                            {
                                embeds: [
                                    new MessageEmbed()
                                        .setAuthor({name: "Monocle Films", iconURL: "https://yt3.ggpht.com/Cpy9tlsukBZg-sOpbJrDRaPpEhVXVRt-h1hNwVt1qylzlsAjwKPAQG9W5nHRormwpuKQ7Im5_w=s88-c-k-c0x00ffffff-no-rj"})
                                        .addFields(
                                            {
                                                name: "Description:",
                                                value: "Monocle is a leading media brand and publisher, with a globally respected print magazine that tells fresh stories from around the world in print, audio and online, and through our daily newsletters, films and lively events. Since 2007 we’ve become a leading voice and authority on everything from soft power to quality of life, design, entrepreneurship, urbanism, travel and culture. With an extensive network of correspondents in key cities and bureaux across three continents, we believe in the power of having reporters on the ground and sending photographers and film-makers on assignment. We also believe in committing great journalism, analysis and ideas to print. Monocle publishes books, travel guides, seasonal newspapers and runs a series of successful shops and cafés. For more, head to monocle.com/about.",
                                                inline: false,
                                            },
                                            {
                                                name: "Subscription Status:",
                                                value: "- Subscribed",
                                                inline: false
                                            }
                                        )
                                        .setColor("GREEN")
                                        .setTimestamp()
                                        .setFooter({text: this.interaction.guild.name, iconURL: this.interaction.guild.iconURL()})
                                ],
                                components: []
                            }
                        ).then().catch(console.error);
                    }).catch(console.error)
                }).catch(console.error);
            }).catch(console.error)
        }
    }
}

module.exports = {
    VerificationManager
}