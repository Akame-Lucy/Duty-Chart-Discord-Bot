import pkg from 'discord.js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import {
    createDutyChart,
    getDutyChart,
    getAllDutyCharts,
    deleteDutyChart,
    addDuty,
    removeDuty,
    createLog,
    addTimeSlot,
    removeTimeSlot
} from './database.js';

dotenv.config();


const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = pkg;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Bot Name: ${packageJson.name}`);
    console.log(`Version: ${packageJson.version}`);
    console.log(`Author: ${packageJson.author}`);
});

async function logAction(action, details, performedBy) {
    try {
        console.log(`Logging action: ${action}, details: ${details}, performedBy: ${performedBy}`);

        // Log to database
        const dbLog = await createLog(action, details, performedBy);
        console.log('Database log created:', dbLog);

        // Log to Discord channel
        const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
        if (!logChannel) {
            console.error('Log channel not found');
            return;
        }
        const logEmbed = new EmbedBuilder()
            .setTitle('Duty Chart Action Log')
            .setColor('#00ff00')
            .addFields(
                { name: 'Action', value: action },
                { name: 'Details', value: details },
                { name: 'Performed By', value: performedBy }
            )
            .setTimestamp();

        const discordLog = await logChannel.send({ embeds: [logEmbed] });
        console.log('Discord log sent:', discordLog);
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

function createDutyChartEmbed(chartName, duties) {
    const embed = new EmbedBuilder()
        .setTitle(`${chartName} Duty Schedule`)
        .setColor('#0099ff')
        .setTimestamp();

    const dutySlots = duties.reduce((acc, duty) => {
        if (!acc[duty.time_slot]) {
            acc[duty.time_slot] = [];
        }
        acc[duty.time_slot].push(`<@${duty.user_id}>`);
        return acc;
    }, {});

    Object.entries(dutySlots).forEach(([timeSlot, users]) => {
        embed.addFields({
            name: timeSlot,
            value: users.length ? users.join('\n') : 'No one assigned',
            inline: true
        });
    });

    return embed;
}

async function updateChartEmbed(chart) {
    try {
        const channel = await client.channels.fetch(chart.channel_id);
        const message = await channel.messages.fetch(chart.message_id);
        const embed = createDutyChartEmbed(chart.name, chart.duties);
        await message.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Error updating chart embed:', error);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const hasEditorRole = message.member.roles.cache.has(process.env.EDITOR_ROLE_ID);

    if (!message.content.startsWith('!duty')) return;

    const args = message.content.split(' ');
    const command = args[1];

    try {
        switch (command) {
            case 'ping': {
                await message.reply('Pong!');
                break;
            }

            case 'create': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to create duty charts.');
                    return;
                }

                const chartName = args[2];
                if (!chartName) {
                    await message.reply('Please provide a chart name: !duty create <chart_name>');
                    return;
                }

                const embed = createDutyChartEmbed(chartName, []);
                const sentMessage = await message.channel.send({ embeds: [embed] });
                await createDutyChart(message.channel.id, chartName, sentMessage.id);
                await logAction(
                    'Create Chart',
                    `Chart "${chartName}" created in channel ${message.channel.name}`,
                    message.author.tag
                );
                await message.reply(`Duty chart "${chartName}" created successfully!`);
                break;
            }

            case 'add': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to modify duty charts.');
                    return;
                }

                const chartName = args[2];
                if (!chartName) {
                    await message.reply('Please provide a chart name: !duty add <chart_name>');
                    return;
                }

                const chart = await getDutyChart(chartName);
                const timeSlots = [...new Set(chart.time_slots.map(slot => slot.time_slot))]; // Ensure unique time slots

                if (timeSlots.length === 0) {
                    await message.reply('No available time slots.');
                    return;
                }

                const timeSlotMenu = new StringSelectMenuBuilder()
                    .setCustomId('select-time-slot')
                    .setPlaceholder('Select a time slot')
                    .addOptions(timeSlots.slice(0, 25).map(slot => ({ label: slot, value: slot })));

                const row = new ActionRowBuilder().addComponents(timeSlotMenu);

                await message.reply({ content: 'Please select a time slot:', components: [row] });

                const filter = i => i.customId === 'select-time-slot' && i.user.id === message.author.id;
                const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

                collector.on('collect', async i => {
                    const timeSlot = i.values[0];
                    await i.update({ content: `Selected time slot: ${timeSlot}. Please type the username:`, components: [] });

                    const usernameCollector = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 15000 });

                    usernameCollector.on('collect', async m => {
                        const username = m.content;
                        const user = message.guild.members.cache.find(member => member.user.username === username);

                        if (!user) {
                            await message.reply('User not found.');
                            return;
                        }

                        await addDuty(chart.id, user.id, user.user.username, timeSlot);

                        const updatedChart = await getDutyChart(chartName);
                        await updateChartEmbed(updatedChart);
                        await logAction(
                            'Add Duty',
                            `Added ${user.user.tag} to "${chartName}" for time slot "${timeSlot}"`,
                            message.author.tag
                        );
                        await message.reply(`Added ${user.user.username} to ${chartName} for ${timeSlot}`);
                        usernameCollector.stop();
                    });
                });

                break;
            }

            case 'remove': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to modify duty charts.');
                    return;
                }

                const chartName = args[2];
                if (!chartName) {
                    await message.reply('Please provide a chart name: !duty remove <chart_name>');
                    return;
                }

                const chart = await getDutyChart(chartName);
                const timeSlots = [...new Set(chart.time_slots.map(slot => slot.time_slot))]; // Ensure unique time slots

                if (timeSlots.length === 0) {
                    await message.reply('No available time slots.');
                    return;
                }

                const timeSlotMenu = new StringSelectMenuBuilder()
                    .setCustomId('select-time-slot')
                    .setPlaceholder('Select a time slot')
                    .addOptions(timeSlots.slice(0, 25).map(slot => ({ label: slot, value: slot })));

                const row = new ActionRowBuilder().addComponents(timeSlotMenu);

                await message.reply({ content: 'Please select a time slot:', components: [row] });

                const filter = i => i.customId === 'select-time-slot' && i.user.id === message.author.id;
                const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

                collector.on('collect', async i => {
                    const timeSlot = i.values[0];
                    await i.update({ content: `Selected time slot: ${timeSlot}. Please type the username:`, components: [] });

                    const usernameCollector = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 15000 });

                    usernameCollector.on('collect', async m => {
                        const username = m.content;
                        const user = message.guild.members.cache.find(member => member.user.username === username);

                        if (!user) {
                            await message.reply('User not found.');
                            return;
                        }

                        await removeDuty(chart.id, user.id, timeSlot);

                        const updatedChart = await getDutyChart(chartName);
                        await updateChartEmbed(updatedChart);
                        await logAction(
                            'Remove Duty',
                            `Removed ${user.user.tag} from "${chartName}" for time slot "${timeSlot}"`,
                            message.author.tag
                        );
                        await message.reply(`Removed ${user.user.username} from ${chartName} for ${timeSlot}`);
                        usernameCollector.stop();
                    });
                });

                break;
            }

            case 'addtimeslot': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to modify duty charts.');
                    return;
                }

                const chartName = args[2];
                const timeSlot = args.slice(3).join(' ');

                if (!chartName || !timeSlot) {
                    await message.reply('Usage: !duty addtimeslot <chart_name> <time_slot>');
                    return;
                }

                const chart = await getDutyChart(chartName);
                await addTimeSlot(chart.id, timeSlot);
                await logAction(
                    'Add Time Slot',
                    `Added time slot "${timeSlot}" to chart "${chartName}"`,
                    message.author.tag
                );
                await message.reply(`Added time slot "${timeSlot}" to chart "${chartName}" successfully!`);
                break;
            }

            case 'removetimeslot': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to modify duty charts.');
                    return;
                }

                const chartName = args[2];
                const timeSlot = args.slice(3).join(' ');

                if (!chartName || !timeSlot) {
                    await message.reply('Usage: !duty removetimeslot <chart_name> <time_slot>');
                    return;
                }

                const chart = await getDutyChart(chartName);
                await removeTimeSlot(chart.id, timeSlot);
                await logAction(
                    'Remove Time Slot',
                    `Removed time slot "${timeSlot}" from chart "${chartName}"`,
                    message.author.tag
                );
                await message.reply(`Removed time slot "${timeSlot}" from chart "${chartName}" successfully!`);
                break;
            }

            case 'list': {
                const charts = await getAllDutyCharts();
                const embed = new EmbedBuilder()
                    .setTitle('Active Duty Charts')
                    .setColor('#0099ff')
                    .setTimestamp();

                charts.forEach(chart => {
                    embed.addFields({
                        name: chart.name,
                        value: `Created: ${new Date(chart.created_at).toLocaleDateString()}`,
                        inline: true
                    });
                });

                await message.channel.send({ embeds: [embed] });
                break;
            }

            case 'view': {
                const chartName = args[2];
                if (!chartName) {
                    await message.reply('Please provide a chart name: !duty view <chart_name>');
                    return;
                }

                const chart = await getDutyChart(chartName);
                const embed = createDutyChartEmbed(chart.name, chart.duties);
                await message.channel.send({ embeds: [embed] });
                break;
            }

            case 'delete': {
                if (!hasEditorRole) {
                    await message.reply('You do not have permission to delete duty charts.');
                    return;
                }

                const chartName = args[2];
                if (!chartName) {
                    await message.reply('Please provide a chart name: !duty delete <chart_name>');
                    return;
                }

                const chart = await getDutyChart(chartName);

                const channel = await client.channels.fetch(chart.channel_id);
                const message = await channel.messages.fetch(chart.message_id);
                await message.delete();

                await deleteDutyChart(chartName);
                await logAction(
                    'Delete Chart',
                    `Chart "${chartName}" deleted from channel ${channel.name}`,
                    message.author.tag
                );
                await message.reply(`Duty chart "${chartName}" deleted successfully!`);
                break;
            }

            case 'help': {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('Duty Bot Commands')
                    .setDescription('Here are the available commands:')
                    .addFields(
                        { name: '!duty ping', value: 'Check the bot\'s connection' },
                        { name: '!duty create <chart_name>', value: 'Create a new duty chart' },
                        { name: '!duty add <chart_name>', value: 'Add a user to a duty slot' },
                        { name: '!duty remove <chart_name>', value: 'Remove a user from a duty slot' },
                        { name: '!duty addtimeslot <chart_name> <time_slot>', value: 'Add a time slot to a duty chart' },
                        { name: '!duty removetimeslot <chart_name> <time_slot>', value: 'Remove a time slot from a duty chart' },
                        { name: '!duty list', value: 'Show all active duty charts' },
                        { name: '!duty view <chart_name>', value: 'Display a specific duty chart' },
                        { name: '!duty delete <chart_name>', value: 'Delete a duty chart' },
                        { name: '!duty help', value: 'Show this help message' }
                    )
                    .setColor('#0099ff');
                await message.channel.send({ embeds: [helpEmbed] });
                break;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        await message.reply('An error occurred while processing your request.');
    }
});

client.login(process.env.DISCORD_TOKEN);
