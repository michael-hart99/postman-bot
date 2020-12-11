declare module 'dynamodb' {
    class DynamoDbTable<T extends Item> {
        get(key: string, callback: (err, res) => void);
        update(values: Object, callback?: (err, res) => void);
        destroy(key: string, callback?: (err, res) => void);
    }

    class ItemRes<T extends Item> {
        'attrs': T
    }
    abstract class Item {
        'updatedAt': string
        'key': string
    }
    class UserItem extends Item {
        'discord_id': string
        'username': string
        'discriminator': string
        'address': {
            'line1': string,
            'line2': string,
            'line3': string,
            'line4': string,
        }
        'quick_cmd': string
    }
    class HistoryItem extends Item {
        'guild': string
        'round_id': string
        'date': string
        'matches': {
            [key:string]: {
                'recipient': string,
                'sent': string,
            },
        }
    }
    class GuildItem extends Item {
        'guild': string
        'authorized_users': {
            [key:string]: string,
        }
        'active_users': {
            [key:string]: string,
        }
        'history_length': string
        'group_channel': string
        'quick_cmd': string
    }
    class MetadataItem extends Item {
        'active_guilds': {
            [key:string]: string,
        }
    }
}
