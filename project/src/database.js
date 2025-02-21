import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export async function createDutyChart(channelId, chartName, messageId) {
    const { data, error } = await supabase
        .from('duty_charts')
        .insert([
            {
                channel_id: channelId,
                name: chartName,
                message_id: messageId,
                created_at: new Date().toISOString()
            }
        ])
        .select();

    if (error) {
        console.error('Error creating duty chart:', error);
        throw error;
    }
    return data[0];
}

export async function getDutyChart(chartName) {
    const { data, error } = await supabase
        .from('duty_charts')
        .select(`
      *,
      duties(*),
      time_slots(*)
    `)
        .eq('name', chartName)
        .single();

    if (error) {
        console.error('Error fetching duty chart:', error);
        throw error;
    }
    return data;
}

export async function getAllDutyCharts() {
    const { data, error } = await supabase
        .from('duty_charts')
        .select(`
      *,
      duties(*),
      time_slots(*)
    `);

    if (error) {
        console.error('Error fetching all duty charts:', error);
        throw error;
    }
    return data;
}

export async function deleteDutyChart(chartName) {
    const { error } = await supabase
        .from('duty_charts')
        .delete()
        .eq('name', chartName);

    if (error) {
        console.error('Error deleting duty chart:', error);
        throw error;
    }
}

export async function addDuty(chartId, userId, username, timeSlot) {
    const { data, error } = await supabase
        .from('duties')
        .insert([
            {
                chart_id: chartId,
                user_id: userId,
                username: username,
                time_slot: timeSlot,
                assigned_at: new Date().toISOString()
            }
        ])
        .select();

    if (error) {
        console.error('Error adding duty:', error);
        throw error;
    }
    return data[0];
}

export async function removeDuty(chartId, userId, timeSlot) {
    const { error } = await supabase
        .from('duties')
        .delete()
        .eq('chart_id', chartId)
        .eq('user_id', userId)
        .eq('time_slot', timeSlot);

    if (error) {
        console.error('Error removing duty:', error);
        throw error;
    }
}

export async function addTimeSlot(chartId, timeSlot) {
    const { data, error } = await supabase
        .from('time_slots')
        .insert([
            {
                chart_id: chartId,
                time_slot: timeSlot,
                created_at: new Date().toISOString()
            }
        ])
        .select();

    if (error) {
        console.error('Error adding time slot:', error);
        throw error;
    }
    return data[0];
}

export async function removeTimeSlot(chartId, timeSlot) {
    const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('chart_id', chartId)
        .eq('time_slot', timeSlot);

    if (error) {
        console.error('Error removing time slot:', error);
        throw error;
    }
}

export async function createLog(action, details, performedBy) {
    const { data, error } = await supabase
        .from('duty_logs')
        .insert([
            {
                action,
                details,
                performed_by: performedBy,
                created_at: new Date().toISOString()
            }
        ])
        .select();

    if (error) {
        console.error('Error creating log:', error);
        throw error;
    }
    return data[0];
}
