# Permissions

## Bot

| Permission      | Description                              |
| --------------- | ---------------------------------------- |
| Manage Webhooks | Used to create a webhook with `/manage`. |

## Application Commands

These are all guild command which should be limited.

| Command   | Configuration                                  | Descriptions                                        |
| --------- | ---------------------------------------------- | --------------------------------------------------- |
| `/delete` | Should be disallowed by default for @everyone. | The command will delete specific bot data.          |
| `/update` | Should be disallowed by default for @everyone. | The command will update specific bot data.          |
| `/manage` | Should only be allowed by admins.              | The command will manage webhooks.                   |
| `/report` | Recommended to be limited by role or channel.  | The command will post data to an external platform. |
