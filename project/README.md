# Project Name
Duty-Chart-Discord-Bot

# Author
[![Author](https://img.shields.io/badge/Author-Akame__Lucy-blue)](https://github.com/Akame-Lucy)

## Description
This project uses Supabase for database management and Discord.js for interacting with Discord.

## Prerequisites
- Node.js
- Supabase account
- Discord bot token

## Setup

### 1. Clone the repository
git clone <repository-url> cd <repository-directory>

### 2. Install dependencies
npm install

### 3. Update or Create a .env file
```
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token
EDITOR_ROLE_ID=your_role_id
LOG_CHANNEL_ID=your_log_channel_id

# Supabase Configuration
SUPABASE_URL=your_supbase_url
SUPABASE_KEY=your_supbase_api_key
```

### 4. Run Supabase migration files
To run Supabase migration files, use the following command:

npx supabase db push

This command will apply all the migration files to your Supabase database.

### 5. Start the application
npm run dev

## How to Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click on **"New Application"**.
3. Give your application a name and click **"Create"**.
4. Navigate to the **"Bot"** tab and click **"Add Bot"**.
5. Under **"TOKEN"**, click **"Reset Token"**, then copy and store the token securely.
6. Enable the required permissions under the **OAuth2** tab.
7. Copy the generated **OAuth2 URL** and use it to invite your bot to your Discord server.

## Usage
- The bot will log actions to the specified Discord channel.
- You can create, fetch, and delete duty charts using the provided functions in `database.js`.

## Contributing
Feel free to open issues or submit pull requests.

## License
This project is licensed under the MIT License.
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
