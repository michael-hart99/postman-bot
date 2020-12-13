import { DynamoDbTable, GuildItem, HistoryItem, Item, MetadataItem, UserItem } from "dynamodb";

const Joi = require('joi');
const dynamo = require('dynamodb');

dynamo.AWS.config.loadFromPath('./credentials.json');

//const userKey = 'user#<discord_id>';
//const historyKey = 'history#<guild>#<round_id|"current"|"previous">';
//const guildKey = 'guild#<guild>';
//const metadataKey = 'metadata';

function handleErr(err: Object | null) {
    if (err) {
        console.log(JSON.stringify(err));
    }
}

export class PostmanTable<T extends Item> {
    private table: DynamoDbTable<T>;

    constructor(name: string, schema: Object) {
        this.table = dynamo.define(`Postman.${name}`, {
            tableName: 'Postman',
            hashKey: 'key',
            timestamps: true,
            schema: schema,
        });
    }
    
    public get(key: string, callback: (item: T | null) => void) {
         this.table.get(key, (err, res) => {
            handleErr(err);
            if (res === null) {
                callback(null);
            } else {
                callback(res['attrs']);
            }
        });
    }

    public async getAsync(key: string) {
        return (await this.table.get(key))['attrs'];
    }

    public update(values: Object, callback?: () => void) {
        this.table.update(values, (err, _) => {
            handleErr(err);
            if (callback) {
                callback();
            }
        });
    }

    public delete(key: string, callback?: () => void) {
        this.table.destroy(key, (err, _) => {
            handleErr(err);
            if (callback) {
                callback();
            }
        });
    }
}

export const UserTable = new PostmanTable<UserItem>('User', {
    key: Joi.string().pattern(/^(user#[0-9]+)$/),
    discord_id: Joi.number(),
    username: Joi.string(),
    discriminator: Joi.number(),
    servers: Joi.object().pattern(
        /^([0-9]+)$/,
        true,
    ),
    address: Joi.object().keys({
        line1: Joi.string(),
        line2: Joi.string(),
        line3: Joi.string(),
        line4: Joi.string(),
    }),
    quick_cmd: Joi.string(),
});
export const HistoryTable = new PostmanTable<HistoryItem>('History', {
    key: Joi.string().pattern(/^(guild#[0-9]+#([0-9]+|current))$/),
    guild: Joi.number(),
    round_id: Joi.number(),
    date: Joi.date().iso(),
    matches: Joi.object().pattern(
        /^([0-9]+)$/,
        Joi.object().keys({
            recipient: Joi.number(),
            sent: Joi.boolean(),
        }),
    ),
});
export const GuildTable = new PostmanTable<GuildItem>('Guild', {
    key: Joi.string().pattern(/^(guild#[0-9]+)$/),
    guild: Joi.number(),
    authorized_users: Joi.object().pattern(
        /^([0-9]+)$/,
        true,
    ),
    active_users: Joi.object().pattern(
        /^([0-9]+)$/,
        true,
    ),
    history_length: Joi.number(),
    group_channel: Joi.number(),
    quick_cmd: Joi.string(),
});
export const MetadataTable = new PostmanTable<MetadataItem>('Metadata', {
    key: Joi.string().pattern(/^(metadata)$/),
    active_guilds: Joi.object().pattern(
        /^([0-9]+)$/,
        true,
    ),
});
