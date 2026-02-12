/**
 * Calendar Node Executors
 * Calendar Read, Calendar Create
 */

import {
    WorkflowNode,
    CalendarReadConfig,
    CalendarCreateConfig,
    CalendarUpdateConfig,
    CalendarDeleteConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

const parseDate = (str: string) => {
    // ISO 8601 (YYYY-MM-DD)
    let date = new Date(str);
    if (!isNaN(date.getTime())) return date;

    // Turkish Format (DD.MM.YYYY or DD/MM/YYYY)
    const match = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        let isoStr = `${year}-${month}-${day}`;
        const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) isoStr += `T${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00`;
        return new Date(isoStr);
    }
    return new Date(str); // Last retry
};

export async function executeCalendarUpdate(
    config: CalendarUpdateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return { success: false, error: 'Takvim izni verilmedi' };

        const eventId = variableManager.resolveString(config.eventId);
        if (!eventId) return { success: false, error: 'Event ID gerekli' };

        const details: Partial<Calendar.Event> = {};
        if (config.title) details.title = variableManager.resolveString(config.title);
        if (config.location) details.location = variableManager.resolveString(config.location);
        if (config.notes) details.notes = variableManager.resolveString(config.notes);
        if (config.startDate) {
            const d = parseDate(variableManager.resolveString(config.startDate));
            if (!isNaN(d.getTime())) details.startDate = d;
        }
        if (config.endDate) {
            const d = parseDate(variableManager.resolveString(config.endDate));
            if (!isNaN(d.getTime())) details.endDate = d;
        }

        await Calendar.updateEventAsync(eventId, details);

        if (config.variableName) variableManager.set(config.variableName, { success: true, eventId });
        return { success: true, eventId };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Güncelleme hatası' };
    }
}

export async function executeCalendarDelete(
    config: CalendarDeleteConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') return { success: false, error: 'Takvim izni verilmedi' };

        const eventId = variableManager.resolveString(config.eventId);
        if (!eventId) return { success: false, error: 'Event ID gerekli' };

        await Calendar.deleteEventAsync(eventId);

        if (config.variableName) variableManager.set(config.variableName, { success: true, deletedId: eventId });
        return { success: true, deletedId: eventId };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Silme hatası' };
    }
}

export async function executeCalendarRead(
    config: CalendarReadConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            return { success: false, error: 'Takvim izni verilmedi' };
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        if (calendars.length === 0) {
            variableManager.set(config.variableName, []);
            return { success: true, events: [], message: 'Takvim bulunamadı' };
        }

        const now = new Date();
        let startDate = new Date(); // Default start
        let endDate = new Date();

        switch (config.type) {
            case 'next':
                // For 'next', we want upcoming events, so start from now
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case 'today':
                // For 'today', we want ALL events of today, even passed ones
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                // For 'week', usually means next 7 days
                endDate.setDate(endDate.getDate() + 7);
                break;
        }

        console.log(`[CALENDAR_READ] Searching from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        let targetCalendars = calendars;

        if (config.calendarName || config.calendarSource) {
            const nameFilter = config.calendarName ? variableManager.resolveString(config.calendarName).toLowerCase() : null;
            const sourceFilter = config.calendarSource ? variableManager.resolveString(config.calendarSource).toLowerCase() : null;

            console.log(`[CALENDAR_READ] Filtering: name=${nameFilter}, source=${sourceFilter}`);

            targetCalendars = calendars.filter(c => {
                let match = true;
                if (nameFilter && !c.title.toLowerCase().includes(nameFilter)) match = false;
                if (sourceFilter && !c.source.name.toLowerCase().includes(sourceFilter)) match = false;
                return match;
            });
        }

        console.log(`[CALENDAR_READ] Found ${targetCalendars.length} target calendars`);

        if (targetCalendars.length === 0) {
            variableManager.set(config.variableName, []);
            return { success: true, events: [], message: 'Filtreye uygun takvim bulunamadı' };
        }

        const events = await Calendar.getEventsAsync(
            targetCalendars.map(c => c.id),
            startDate,
            endDate
        );

        console.log(`[CALENDAR_READ] Found ${events.length} raw events`);

        const limitedEvents = events.slice(0, config.maxEvents || 5).map(e => ({
            id: e.id,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            location: e.location,
            notes: e.notes,
            calendarId: e.calendarId // Useful to know which calendar it came from
        }));

        console.log(`[CALENDAR_READ] Returning ${limitedEvents.length} events`);

        variableManager.set(config.variableName, limitedEvents);

        return {
            success: true,
            events: limitedEvents,
            count: limitedEvents.length,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Takvim okunamadı',
        };
    }
}

export async function executeCalendarCreate(
    config: CalendarCreateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            return { success: false, error: 'Takvim izni verilmedi' };
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

        let targetCalendar;

        if (config.calendarName || config.calendarSource) {
            const nameFilter = config.calendarName ? variableManager.resolveString(config.calendarName).toLowerCase() : null;
            const sourceFilter = config.calendarSource ? variableManager.resolveString(config.calendarSource).toLowerCase() : null;

            targetCalendar = calendars.find(c => {
                if (!c.allowsModifications) return false;

                let match = true;
                if (nameFilter && !c.title.toLowerCase().includes(nameFilter)) match = false;
                if (sourceFilter && !c.source.name.toLowerCase().includes(sourceFilter)) match = false;

                return match;
            });
        }

        if (!targetCalendar) {
            targetCalendar = calendars.find(c => c.allowsModifications) || calendars[0];
        }

        if (!targetCalendar) {
            return { success: false, error: 'Yazılabilir takvim bulunamadı' };
        }

        const title = variableManager.resolveString(config.title);
        const resolvedStartDate = config.startDate ? variableManager.resolveString(config.startDate) : undefined;
        const resolvedEndDate = config.endDate ? variableManager.resolveString(config.endDate) : undefined;

        const parseDate = (str: string) => {
            // ISO 8601 (YYYY-MM-DD)
            let date = new Date(str);
            if (!isNaN(date.getTime())) return date;

            // Turkish Format (DD.MM.YYYY or DD/MM/YYYY)
            // Regex to allow day.month.year or day/month/year
            const match = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
            if (match) {
                // Convert to YYYY-MM-DD
                const day = match[1].padStart(2, '0');
                const month = match[2].padStart(2, '0');
                const year = match[3];
                // Note: Time component might be lost here if only date is passed.
                // If the string also contained time, we should probably preserve it.
                // Assuming format "DD.MM.YYYY HH:mm"

                let isoStr = `${year}-${month}-${day}`;

                // Check if time is present
                const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                    isoStr += `T${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:00`;
                }

                date = new Date(isoStr);
                if (!isNaN(date.getTime())) return date;
            }
            return new Date(str); // Last retry
        };

        const startDate = resolvedStartDate ? parseDate(resolvedStartDate) : new Date();
        if (isNaN(startDate.getTime())) {
            return { success: false, error: `Geçersiz başlangıç tarihi: ${resolvedStartDate}` };
        }

        const endDate = resolvedEndDate ? new Date(resolvedEndDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
        if (isNaN(endDate.getTime())) {
            return { success: false, error: `Geçersiz bitiş tarihi: ${resolvedEndDate}` };
        }

        const eventId = await Calendar.createEventAsync(targetCalendar.id, {
            title,
            startDate,
            endDate,
            notes: config.notes ? variableManager.resolveString(config.notes) : undefined,
            location: config.location ? variableManager.resolveString(config.location) : undefined,
        });

        return {
            success: true,
            eventId,
            title,
            calendarName: targetCalendar.title,
            calendarSource: targetCalendar.source.name,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Etkinlik oluşturulamadı',
        };
    }
}
